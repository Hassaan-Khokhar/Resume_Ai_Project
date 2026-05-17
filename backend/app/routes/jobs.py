"""Jobs marketplace routes with AI compatibility check + Application system."""
import time
import base64
from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import Optional
from app.auth import get_current_user
from app.models import CreateJobRequest, SubmitApplicationRequest
from app.config import settings
from app.database import (
    job_postings_col, match_reports_col, users_col, resumes_col,
    pipeline_job_applicants_ranked, activity_logs_col, applications_col
)
from app.pdf_parser import extract_text_from_pdf, extract_skills_from_text, estimate_experience_years
from app.gemini_engine import analyze_with_gemini
from app.ml_engine import compute_fallback_score

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])


@router.get("/")
async def list_jobs(skip: int = 0, limit: int = 20, search: str = "", user_id: str = Depends(get_current_user)):
    query = {}
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
        ]

    jobs = await job_postings_col().find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)

    for j in jobs:
        j["_id"] = str(j["_id"])
        j["applicant_count"] = await applications_col().count_documents({"job_id": j["_id"]})
        # Check if current user has a match report for this job
        report = await match_reports_col().find_one({"user_id": user_id, "job_id": str(j["_id"])})
        j["user_match_score"] = report["match_score"] if report else None
        # Check if current user already applied
        app = await applications_col().find_one({"user_id": user_id, "job_id": str(j["_id"])})
        j["user_applied"] = bool(app)

    return {"success": True, "data": jobs}


@router.post("/create")
async def create_job(req: CreateJobRequest, user_id: str = Depends(get_current_user)):
    # Verify user is a company
    user = await users_col().find_one({"_id": ObjectId(user_id)})
    if not user or user.get("role") != "company":
        raise HTTPException(403, "Only company accounts can post jobs")

    # Process application form fields — assign IDs
    form_fields = None
    if req.application_form:
        form_fields = []
        for i, field in enumerate(req.application_form):
            fd = field.dict()
            fd["id"] = fd.get("id") or f"field_{i}"
            form_fields.append(fd)

    job_doc = {
        "company_id": user_id,
        "company_name": user.get("name", ""),
        "title": req.title,
        "description": req.description,
        "requirements": req.requirements,
        "location": req.location,
        "salary_range": req.salary_range,
        "job_type": req.job_type,
        "duration": req.duration,
        "poster": req.poster,
        "application_form": form_fields,  # None = resume-only, List = custom form
        "created_at": datetime.utcnow(),
    }
    result = await job_postings_col().insert_one(job_doc)
    await activity_logs_col().insert_one({"user_id": user_id, "action": "post_job", "created_at": datetime.utcnow()})
    return {"success": True, "data": {"_id": str(result.inserted_id)}}


# ─── Recruiter Dashboard (MUST be before /{job_id} routes) ───
@router.get("/dashboard/my-jobs")
async def recruiter_dashboard(user_id: str = Depends(get_current_user)):
    """Get all jobs posted by the current company user with applicant counts."""
    user = await users_col().find_one({"_id": ObjectId(user_id)})
    if not user or user.get("role") != "company":
        raise HTTPException(403, "Only company accounts have a recruiter dashboard")
    jobs = await job_postings_col().find({"company_id": user_id}).sort("created_at", -1).to_list(length=100)
    for j in jobs:
        j["_id"] = str(j["_id"])
        j["applicant_count"] = await applications_col().count_documents({"job_id": j["_id"]})
        j.pop("poster", None)
    return {"success": True, "data": jobs}


@router.get("/{job_id}")
async def get_job(job_id: str, user_id: str = Depends(get_current_user)):
    job = await job_postings_col().find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(404, "Job not found")
    job["_id"] = str(job["_id"])
    job["applicant_count"] = await applications_col().count_documents({"job_id": job["_id"]})
    return {"success": True, "data": job}


@router.put("/{job_id}")
async def update_job(job_id: str, request: CreateJobRequest, user_id: str = Depends(get_current_user)):
    job = await job_postings_col().find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(404, "Job not found")
    if job.get("company_id") != user_id:
        raise HTTPException(403, "You can only edit your own job postings")
        
    update_data = request.model_dump(exclude_unset=True)
    await job_postings_col().update_one({"_id": ObjectId(job_id)}, {"$set": update_data})
    await activity_logs_col().insert_one({"user_id": user_id, "action": "update_job", "job_id": job_id, "created_at": datetime.utcnow()})
    return {"success": True, "message": "Job updated successfully"}


@router.delete("/{job_id}")
async def delete_job(job_id: str, user_id: str = Depends(get_current_user)):
    job = await job_postings_col().find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(404, "Job not found")
    if job.get("company_id") != user_id:
        raise HTTPException(403, "You can only delete your own job postings")
        
    await job_postings_col().delete_one({"_id": ObjectId(job_id)})
    # Clean up associated applications
    await applications_col().delete_many({"job_id": job_id})
    await activity_logs_col().insert_one({"user_id": user_id, "action": "delete_job", "job_id": job_id, "created_at": datetime.utcnow()})
    return {"success": True, "message": "Job deleted successfully"}


@router.get("/{job_id}/applicants")
async def get_job_applicants(job_id: str, user_id: str = Depends(get_current_user)):
    """Ranked applicants using advanced aggregation pipeline with $lookup + $facet."""
    result = await pipeline_job_applicants_ranked(job_id)
    return {"success": True, "data": result}


# ─── Apply to Job (Resume upload — default method) ───
@router.post("/{job_id}/apply")
async def apply_to_job(
    job_id: str,
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
):
    """Apply to a job by uploading a resume (PDF/DOCX). This is the default apply method."""
    job = await job_postings_col().find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(404, "Job not found")

    # Prevent duplicate applications
    existing = await applications_col().find_one({"user_id": user_id, "job_id": job_id})
    if existing:
        raise HTTPException(400, "You have already applied to this job")

    # Read and validate file
    allowed = (".pdf", ".doc", ".docx")
    if not file.filename.lower().endswith(allowed):
        raise HTTPException(400, "Only PDF and Word files are accepted")

    contents = await file.read()
    if len(contents) / (1024 * 1024) > settings.MAX_FILE_SIZE_MB:
        raise HTTPException(400, "File too large (max 5MB)")

    # Store resume as Base64 for preview/download
    file_b64 = base64.b64encode(contents).decode("utf-8")

    user = await users_col().find_one({"_id": ObjectId(user_id)})

    application_doc = {
        "user_id": user_id,
        "job_id": job_id,
        "job_title": job["title"],
        "applicant_name": user.get("name", "") if user else "",
        "applicant_email": user.get("email", "") if user else "",
        "applicant_avatar": user.get("avatar", "") if user else "",
        "applicant_headline": user.get("headline", "") if user else "",
        "method": "resume",
        "resume_filename": file.filename,
        "resume_data": file_b64,
        "answers": {},
        "status": "pending",  # pending, reviewed, shortlisted, rejected
        "created_at": datetime.utcnow(),
    }
    await applications_col().insert_one(application_doc)
    await activity_logs_col().insert_one({
        "user_id": user_id, "action": "apply_job",
        "job_id": job_id, "created_at": datetime.utcnow(),
    })

    return {"success": True, "message": "Application submitted successfully!"}


# ─── Apply to Job (Custom form submission) ───
@router.post("/{job_id}/apply-form")
async def apply_to_job_form(
    job_id: str,
    file: UploadFile = File(...),
    answers_json: str = Form("{}"),
    user_id: str = Depends(get_current_user),
):
    """Apply to a job by submitting a custom application form + mandatory resume."""
    import json

    job = await job_postings_col().find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(404, "Job not found")

    existing = await applications_col().find_one({"user_id": user_id, "job_id": job_id})
    if existing:
        raise HTTPException(400, "You have already applied to this job")

    # Parse answers
    try:
        answers = json.loads(answers_json)
    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid form answers")

    # Read resume file
    allowed = (".pdf", ".doc", ".docx")
    if not file.filename.lower().endswith(allowed):
        raise HTTPException(400, "Only PDF and Word files are accepted")

    contents = await file.read()
    if len(contents) / (1024 * 1024) > settings.MAX_FILE_SIZE_MB:
        raise HTTPException(400, "File too large (max 5MB)")

    file_b64 = base64.b64encode(contents).decode("utf-8")
    user = await users_col().find_one({"_id": ObjectId(user_id)})

    application_doc = {
        "user_id": user_id,
        "job_id": job_id,
        "job_title": job["title"],
        "applicant_name": user.get("name", "") if user else "",
        "applicant_email": user.get("email", "") if user else "",
        "applicant_avatar": user.get("avatar", "") if user else "",
        "applicant_headline": user.get("headline", "") if user else "",
        "method": "form",
        "resume_filename": file.filename,
        "resume_data": file_b64,
        "answers": answers,
        "status": "pending",
        "created_at": datetime.utcnow(),
    }
    await applications_col().insert_one(application_doc)
    await activity_logs_col().insert_one({
        "user_id": user_id, "action": "apply_job_form",
        "job_id": job_id, "created_at": datetime.utcnow(),
    })

    return {"success": True, "message": "Application submitted successfully!"}


# ─── Recruiter Dashboard: List applications for a job ───
@router.get("/{job_id}/applications")
async def get_job_applications(job_id: str, user_id: str = Depends(get_current_user)):
    """Recruiter endpoint: Get all applications for a specific job."""
    job = await job_postings_col().find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(404, "Job not found")
    if job.get("company_id") != user_id:
        raise HTTPException(403, "Only the job poster can view applications")

    apps = await applications_col().find(
        {"job_id": job_id}
    ).sort("created_at", -1).to_list(length=200)

    for a in apps:
        a["_id"] = str(a["_id"])
        # Don't send full resume binary in list view (too large)
        a["has_resume"] = bool(a.get("resume_data"))
        a.pop("resume_data", None)

    return {"success": True, "data": apps, "job": {"title": job["title"], "applicant_count": job.get("applicant_count", 0)}}


# ─── Recruiter: Download/preview a specific applicant's resume ───
@router.get("/{job_id}/applications/{app_id}/resume")
async def get_application_resume(job_id: str, app_id: str, user_id: str = Depends(get_current_user)):
    """Download the resume of a specific applicant."""
    job = await job_postings_col().find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(404, "Job not found")
    if job.get("company_id") != user_id:
        raise HTTPException(403, "Only the job poster can download resumes")

    app = await applications_col().find_one({"_id": ObjectId(app_id), "job_id": job_id})
    if not app:
        raise HTTPException(404, "Application not found")

    return {
        "success": True,
        "data": {
            "filename": app.get("resume_filename", "resume.pdf"),
            "resume_data": app.get("resume_data", ""),
            "applicant_name": app.get("applicant_name", ""),
        }
    }


# ─── Recruiter: Update application status ───
@router.put("/{job_id}/applications/{app_id}/status")
async def update_application_status(
    job_id: str, app_id: str,
    status: str = Form(...),
    user_id: str = Depends(get_current_user),
):
    """Update status of an application: pending, reviewed, shortlisted, rejected."""
    job = await job_postings_col().find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(404, "Job not found")
    if job.get("company_id") != user_id:
        raise HTTPException(403, "Only the job poster can update application status")

    valid = ["pending", "reviewed", "shortlisted", "rejected"]
    if status not in valid:
        raise HTTPException(400, f"Status must be one of: {', '.join(valid)}")

    await applications_col().update_one(
        {"_id": ObjectId(app_id), "job_id": job_id},
        {"$set": {"status": status, "updated_at": datetime.utcnow()}}
    )
    return {"success": True, "message": f"Status updated to {status}"}




# ─── AI Compatibility Check (unchanged) ───
@router.post("/{job_id}/check-compatibility")
async def check_job_compatibility(
    job_id: str,
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
):
    """
    AI Compatibility Check — auto-pulls the job description from the posting,
    user only uploads their CV. No manual JD input needed.
    """
    start = time.time()

    # 1. Fetch the job posting
    job = await job_postings_col().find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(404, "Job not found")

    # Build job description from posting data automatically
    jd_parts = [f"Job Title: {job['title']}", f"Description: {job['description']}"]
    if job.get("requirements"):
        jd_parts.append(f"Requirements: {', '.join(job['requirements'])}")
    if job.get("location"):
        jd_parts.append(f"Location: {job['location']}")
    if job.get("job_type"):
        jd_parts.append(f"Type: {job['job_type']}")
    job_description = "\n".join(jd_parts)

    # 2. Parse uploaded CV
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files accepted")

    contents = await file.read()
    if len(contents) / (1024 * 1024) > settings.MAX_FILE_SIZE_MB:
        raise HTTPException(400, "File too large")

    resume_text = extract_text_from_pdf(contents)
    if not resume_text or len(resume_text) < 50:
        raise HTTPException(400, "Could not extract text from PDF")

    skills = extract_skills_from_text(resume_text)
    exp_years = estimate_experience_years(resume_text)

    # 3. Save resume record
    await resumes_col().insert_one({
        "user_id": user_id,
        "filename": file.filename,
        "raw_text": resume_text[:10000],
        "skills": skills,
        "experience_years": exp_years,
        "created_at": datetime.utcnow(),
    })

    # 4. AI Analysis (Gemini with ML fallback)
    try:
        result = await analyze_with_gemini(resume_text, job_description)
    except Exception as e:
        import traceback
        print(f"[FALLBACK] Gemini failed, using ML fallback: {type(e).__name__}: {e}")
        traceback.print_exc()
        result = compute_fallback_score(resume_text, job_description)

    # 5. Save match report linked to this job
    report_doc = {
        "user_id": user_id,
        "job_id": job_id,
        "job_title": job["title"],
        "match_score": result.get("match_score", 0),
        "skills_score": result.get("skills_score", 0),
        "experience_score": result.get("experience_score", 0),
        "keyword_score": result.get("keyword_score", 0),
        "matched_skills": result.get("matched_skills", []),
        "missing_skills": result.get("missing_skills", []),
        "experience_analysis": result.get("experience_analysis", {}),
        "strengths": result.get("strengths", []),
        "improvements": result.get("improvements", []),
        "rewritten_summary": result.get("rewritten_summary", ""),
        "keyword_matches": result.get("keyword_matches", []),
        "ats_tips": result.get("ats_tips", []),
        "model_used": result.get("_meta", {}).get("model", "unknown"),
        "created_at": datetime.utcnow(),
    }
    report_result = await match_reports_col().insert_one(report_doc)
    # Note: AI compatibility checks do NOT increment applicant_count — only real applications do

    latency = (time.time() - start) * 1000
    await activity_logs_col().insert_one({
        "user_id": user_id, "action": "job_compatibility_check",
        "job_id": job_id, "latency_ms": round(latency, 2),
        "created_at": datetime.utcnow(),
    })

    return {"success": True, "analysis_id": str(report_result.inserted_id), "data": result}
