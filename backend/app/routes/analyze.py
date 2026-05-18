"""AI Resume Analysis route — the AI Command Center backend."""
import time
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from app.auth import get_current_user
from app.config import settings
from app.database import resumes_col, job_postings_col, match_reports_col, activity_logs_col
from app.pdf_parser import extract_text_from_pdf, extract_skills_from_text, estimate_experience_years
from app.gemini_engine import analyze_with_gemini
from app.ml_engine import compute_fallback_score
from bson import ObjectId

router = APIRouter(prefix="/analyze", tags=["AI Analysis"])


@router.post("/")
async def analyze_resume(
    file: UploadFile = File(...),
    job_description: str = Form(..., min_length=20),
    job_id: str = Form(default=""),
    user_id: str = Depends(get_current_user),
):
    start = time.time()

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files accepted")

    contents = await file.read()
    if len(contents) / (1024 * 1024) > settings.MAX_FILE_SIZE_MB:
        raise HTTPException(400, "File too large")

    # Step 1: Parse PDF
    resume_text = extract_text_from_pdf(contents)
    if not resume_text or len(resume_text) < 50:
        raise HTTPException(400, "Could not extract text from PDF")

    skills = extract_skills_from_text(resume_text)
    exp_years = estimate_experience_years(resume_text)

    # Step 2: Save resume
    resume_doc = {
        "user_id": user_id,
        "filename": file.filename,
        "raw_text": resume_text[:10000],
        "skills": skills,
        "experience_years": exp_years,
        "created_at": datetime.utcnow(),
    }
    await resumes_col().insert_one(resume_doc)


    # Step 3: AI Analysis (Gemini with ML fallback)
    gemini_error = None
    try:
        result = await analyze_with_gemini(resume_text, job_description)
    except Exception as e:
        import traceback
        gemini_error = f"{type(e).__name__}: {e}"
        print(f"[FALLBACK] Gemini failed, using ML fallback: {gemini_error}")
        traceback.print_exc()
        result = compute_fallback_score(resume_text, job_description)
        result["_gemini_error"] = gemini_error

    # Step 4: Save match report
    report_doc = {
        "user_id": user_id,
        "job_id": job_id or "manual",
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

    # Step 5: Log activity
    latency = (time.time() - start) * 1000
    await activity_logs_col().insert_one({
        "user_id": user_id, "action": "analyze_resume",
        "latency_ms": round(latency, 2),
        "model": result.get("_meta", {}).get("model", "unknown"),
        "created_at": datetime.utcnow(),
    })

    # AI analysis does not count as a job application

    return {"success": True, "analysis_id": str(report_result.inserted_id), "data": result}


@router.get("/history")
async def get_history(user_id: str = Depends(get_current_user), limit: int = 20):
    reports = await match_reports_col().find({"user_id": user_id}).sort("created_at", -1).limit(limit).to_list(length=limit)
    for r in reports:
        r["_id"] = str(r["_id"])
    return {"success": True, "data": reports}


@router.get("/debug")
async def debug_gemini():
    """Diagnostic endpoint to check Gemini API key and connectivity."""
    import os
    raw_env = os.getenv("GEMINI_API_KEY", "")
    cleaned = settings.GEMINI_API_KEY

    info = {
        "raw_env_length": len(raw_env),
        "raw_env_first_10": raw_env[:10] + "..." if len(raw_env) > 10 else raw_env,
        "raw_env_has_quotes": raw_env.startswith('"') or raw_env.startswith("'"),
        "cleaned_length": len(cleaned),
        "cleaned_first_10": cleaned[:10] + "..." if len(cleaned) > 10 else cleaned,
        "model": settings.GEMINI_MODEL,
    }

    # Try a simple Gemini call
    try:
        from google import genai
        client = genai.Client(api_key=cleaned)
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents="Say hello in one word.",
        )
        info["gemini_test"] = "SUCCESS"
        info["gemini_response"] = response.text[:100]
    except Exception as e:
        info["gemini_test"] = "FAILED"
        info["gemini_error"] = f"{type(e).__name__}: {str(e)}"

    return info
