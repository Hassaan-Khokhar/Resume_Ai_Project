"""
Module D: Intelligence Engine — Gemini LLM Integration
Performs high-level reasoning on resume text against job descriptions.
Uses prompt engineering with constrained JSON output.
Migrated to the new google-genai SDK (the old google-generativeai is deprecated).
"""

import json
import time
import traceback
import asyncio
from google import genai
from app.config import settings


ANALYSIS_PROMPT = """You are an expert Senior Technical Recruiter and ATS (Applicant Tracking System) specialist with 15+ years of experience.

**Your Task:** Analyze the following RESUME against the provided JOB DESCRIPTION. Perform a thorough gap analysis and return your assessment.

---
**RESUME TEXT:**
{resume_text}

---
**JOB DESCRIPTION:**
{job_description}

---

**Instructions:** Return ONLY a valid JSON object (no markdown, no code fences, no explanation) with the following structure:

{{
  "match_score": <integer 0-100>,
  "skills_score": <float 0-100, percentage of required hard skills the candidate has>,
  "experience_score": <float 0-100, how well experience matches>,
  "keyword_score": <float 0-100, keyword and buzzword alignment>,
  "matched_skills": [<list of skills the candidate HAS that match the JD>],
  "missing_skills": [
    {{
      "skill": "<skill name>",
      "importance": "<high|medium|low>",
      "suggestion": "<brief suggestion on how to acquire this skill>"
    }}
  ],
  "experience_analysis": {{
    "required_years": <int or null>,
    "candidate_years": <int or null>,
    "match_percentage": <float 0-100>,
    "notes": "<brief assessment of experience fit>"
  }},
  "strengths": [<list of 3-5 candidate strengths relevant to this role>],
  "improvements": [<list of 3-5 specific, actionable improvement suggestions>],
  "rewritten_summary": "<A rewritten professional summary tailored to this JD, 3-4 sentences>",
  "keyword_matches": [<list of important JD keywords found in the resume>],
  "ats_tips": [<list of 3-5 ATS optimization tips specific to this resume/JD combination>]
}}

**Critical Rules:**
1. The match_score MUST be calculated using this weighted formula:
   match_score = (skills_score * 0.6) + (experience_score * 0.3) + (keyword_score * 0.1)
2. Be honest and precise — do not inflate scores.
3. missing_skills should include skills mentioned in the JD but absent from the resume.
4. Return ONLY the JSON object, nothing else.
"""


async def analyze_with_gemini(resume_text: str, job_description: str) -> dict:
    """
    Send resume text and job description to Gemini for analysis.
    Uses the new google-genai SDK with asyncio.to_thread for non-blocking execution.

    Args:
        resume_text: Cleaned text extracted from the PDF resume.
        job_description: The job description text from the user.

    Returns:
        Dictionary containing the structured analysis result.

    Raises:
        ValueError: If Gemini returns invalid JSON.
        Exception: For API communication errors.
    """
    prompt = ANALYSIS_PROMPT.format(
        resume_text=resume_text,
        job_description=job_description
    )

    # Try multiple models in case one is rate-limited
    MODELS_TO_TRY = [
        settings.GEMINI_MODEL,
        "gemini-2.0-flash-lite",
        "gemini-1.5-flash",
    ]

    def _call_gemini():
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not set or empty in environment variables.")
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        
        last_error = None
        for model_name in MODELS_TO_TRY:
            try:
                print(f"[GEMINI] Trying model: {model_name}")
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config={
                        "temperature": 0.2,
                        "response_mime_type": "application/json",
                    }
                )
                return response, model_name
            except Exception as e:
                last_error = e
                if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                    print(f"[GEMINI] Rate limited on {model_name}, trying next...")
                    continue
                else:
                    raise  # Non-rate-limit errors should fail immediately
        
        raise last_error  # All models exhausted

    start_time = time.time()
    api_key_len = len(settings.GEMINI_API_KEY)
    print(f"[GEMINI] Calling API (key_len: {api_key_len})...")

    response, used_model = await asyncio.to_thread(_call_gemini)

    latency_ms = (time.time() - start_time) * 1000
    print(f"[GEMINI] Responded in {latency_ms:.0f}ms (model: {used_model})")

    # Extract the text response
    response_text = response.text.strip()

    # Clean potential markdown code fences
    if response_text.startswith("```"):
        response_text = response_text.split("\n", 1)[-1]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()

    # Parse JSON (with robust fallback for truncated strings)
    try:
        result = json.loads(response_text)
    except json.JSONDecodeError as e:
        print(f"[GEMINI WARNING] Truncated JSON detected. Attempting regex recovery...")
        import re
        result = {}
        
        match_score_match = re.search(r'"match_score"\s*:\s*(\d+(?:\.\d+)?)', response_text)
        if match_score_match: result["match_score"] = float(match_score_match.group(1))
        
        skills_score_match = re.search(r'"skills_score"\s*:\s*(\d+(?:\.\d+)?)', response_text)
        if skills_score_match: result["skills_score"] = float(skills_score_match.group(1))
        
        exp_score_match = re.search(r'"experience_score"\s*:\s*(\d+(?:\.\d+)?)', response_text)
        if exp_score_match: result["experience_score"] = float(exp_score_match.group(1))
        
        kw_score_match = re.search(r'"keyword_score"\s*:\s*(\d+(?:\.\d+)?)', response_text)
        if kw_score_match: result["keyword_score"] = float(kw_score_match.group(1))
        
        if "match_score" not in result:
            raise ValueError(f"Gemini returned unparseable truncated JSON: {str(e)}")
            
        result["matched_skills"] = []
        result["missing_skills"] = []
        result["strengths"] = ["Strong alignment detected (partial AI response)"]
        result["improvements"] = []
        result["rewritten_summary"] = "AI successfully analyzed your resume, but the response stream was truncated. We have recovered your AI match scores above."

    # Recalculate match_score using the weighted formula to ensure accuracy
    skills_score = float(result.get("skills_score", 0))
    experience_score = float(result.get("experience_score", 0))
    keyword_score = float(result.get("keyword_score", 0))

    calculated_score = (skills_score * 0.6) + (experience_score * 0.3) + (keyword_score * 0.1)
    result["match_score"] = round(calculated_score, 1)

    print(f"[GEMINI] Analysis complete - Match Score: {result['match_score']}%")

    # Attach metadata
    result["_meta"] = {
        "latency_ms": round(latency_ms, 2),
        "model": used_model,
    }

    return result
