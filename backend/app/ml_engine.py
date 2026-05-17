"""
Machine Learning Module — Cosine Similarity + Skill-Based Matching
Provides a TF-IDF + Cosine Similarity based match score
as a fallback when the Gemini API is unavailable.
Demonstrates traditional ML/NLP techniques for the ML course.

Key ML Concepts Used:
  - TF-IDF Vectorization (Term Frequency - Inverse Document Frequency)
  - Cosine Similarity for document comparison
  - N-gram analysis (unigrams + bigrams)
  - Curated skill taxonomy for domain-specific NER (Named Entity Recognition)
"""

import re
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


# ─── Curated Skill Taxonomy ─────────────────────────────────
# This acts as a domain-specific Named Entity Recognition (NER) dictionary.
# Instead of relying on raw TF-IDF (which picks up noise like "highly", "comma"),
# we use a curated multi-category skill taxonomy to identify real technical skills.

SKILL_TAXONOMY = {
    # Programming Languages
    "python", "java", "javascript", "typescript", "c++", "c#", "go", "rust",
    "ruby", "php", "swift", "kotlin", "dart", "scala", "perl", "r",
    "matlab", "lua", "haskell", "elixir", "objective-c",

    # Frontend Frameworks & Libraries
    "react", "react.js", "reactjs", "angular", "vue", "vue.js", "vuejs",
    "next.js", "nextjs", "nuxt.js", "svelte", "jquery", "ember",
    "html", "html5", "css", "css3", "sass", "scss", "less",
    "tailwind", "tailwindcss", "bootstrap", "material ui", "chakra ui",
    "styled-components", "webpack", "vite", "babel",

    # Backend Frameworks
    "node.js", "nodejs", "express", "express.js", "django", "flask", "fastapi",
    "spring", "spring boot", "laravel", "rails", "ruby on rails",
    "asp.net", ".net", "nest.js", "nestjs", "gin", "fiber",

    # Databases
    "sql", "nosql", "mongodb", "postgresql", "postgres", "mysql", "sqlite",
    "redis", "cassandra", "dynamodb", "firebase", "supabase", "cockroachdb",
    "oracle", "mariadb", "neo4j", "elasticsearch",
    "database design", "database", "databases",

    # Cloud & DevOps
    "aws", "azure", "gcp", "google cloud", "docker", "kubernetes", "k8s",
    "terraform", "ansible", "jenkins", "ci/cd", "github actions",
    "gitlab ci", "circleci", "heroku", "vercel", "netlify", "digitalocean",
    "nginx", "apache", "linux", "bash", "powershell", "shell scripting",

    # AI / ML / Data Science
    "machine learning", "deep learning", "artificial intelligence", "ai", "ml",
    "nlp", "natural language processing", "computer vision",
    "tensorflow", "pytorch", "keras", "scikit-learn", "sklearn",
    "pandas", "numpy", "matplotlib", "seaborn", "scipy",
    "data analysis", "data science", "data engineering", "data visualization",
    "neural networks", "transformers", "hugging face", "langchain",
    "opencv", "yolo", "gpt", "llm", "large language models",

    # Mobile Development
    "flutter", "react native", "android", "ios", "swiftui",
    "kotlin multiplatform", "xamarin", "ionic", "capacitor",
    "mobile development", "cross-platform", "mobile",

    # APIs & Architecture
    "rest", "rest api", "restful", "graphql", "grpc", "websocket",
    "microservices", "serverless", "api design", "api",
    "mvc", "mvvm", "clean architecture", "design patterns",
    "software engineering", "software development",

    # Version Control & Tools
    "git", "github", "gitlab", "bitbucket", "svn",
    "jira", "confluence", "trello", "slack",
    "figma", "photoshop", "illustrator", "xd",

    # Testing & QA
    "unit testing", "jest", "mocha", "pytest", "selenium",
    "cypress", "playwright", "tdd", "bdd", "qa",

    # Methodologies & Soft Skills
    "agile", "scrum", "kanban", "waterfall",
    "problem-solving", "problem solving", "teamwork", "communication",
    "leadership", "project management", "time management",
    "critical thinking", "adaptability", "collaboration",

    # Web Technologies
    "web development", "full-stack", "full stack", "fullstack",
    "frontend", "front-end", "backend", "back-end",
    "responsive design", "progressive web app", "pwa",
    "seo", "web scraping", "web security", "oauth", "jwt",
}


def compute_cosine_similarity(text_a: str, text_b: str) -> float:
    """
    Compute cosine similarity between two text documents
    using TF-IDF vectorization.

    Args:
        text_a: First document (e.g., resume text)
        text_b: Second document (e.g., job description)

    Returns:
        Similarity score between 0.0 and 1.0
    """
    vectorizer = TfidfVectorizer(
        stop_words='english',
        max_features=5000,
        ngram_range=(1, 2),  # Unigrams and bigrams
    )

    tfidf_matrix = vectorizer.fit_transform([text_a, text_b])
    similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])

    return float(similarity[0][0])


def extract_skills_from_text(text: str) -> list:
    """
    Extract real technical skills from text using the curated skill taxonomy.
    This is a domain-specific NER approach — far more accurate than raw TF-IDF
    keyword extraction for skill identification.

    Args:
        text: Any text (resume or job description).

    Returns:
        List of recognized skills found in the text.
    """
    text_lower = text.lower()
    found = []

    for skill in SKILL_TAXONOMY:
        # Use word boundary matching for short skills to avoid false positives
        # e.g., "r" should not match inside "react" or "responsive"
        if len(skill) <= 2:
            pattern = r'\b' + re.escape(skill) + r'\b'
            if re.search(pattern, text_lower):
                found.append(skill)
        else:
            if skill in text_lower:
                found.append(skill)

    return list(set(found))


def compute_skill_match(resume_skills: list, jd_skills: list) -> dict:
    """
    Compute skill-based matching metrics between resume and job description.

    Args:
        resume_skills: List of skills found in the resume.
        jd_skills: List of skills required by the job description.

    Returns:
        Dictionary with matched, missing, and percentage.
    """
    resume_set = set(s.lower().strip() for s in resume_skills)
    jd_set = set(s.lower().strip() for s in jd_skills)

    matched = resume_set & jd_set
    missing = jd_set - resume_set
    extra = resume_set - jd_set

    match_pct = (len(matched) / len(jd_set) * 100) if jd_set else 100

    return {
        "matched": sorted(list(matched)),
        "missing": sorted(list(missing)),
        "extra": sorted(list(extra)),
        "match_percentage": round(match_pct, 1),
        "total_required": len(jd_set),
        "total_matched": len(matched),
    }


def compute_keyword_density(text: str, keywords: list) -> dict:
    """
    Measure how many job-specific keywords appear in the resume text.

    Args:
        text: The resume text.
        keywords: Important keywords from the job description.

    Returns:
        Dictionary with found keywords and density percentage.
    """
    text_lower = text.lower()
    found = []
    not_found = []

    for kw in keywords:
        if kw.lower() in text_lower:
            found.append(kw)
        else:
            not_found.append(kw)

    density = (len(found) / len(keywords) * 100) if keywords else 0

    return {
        "found_keywords": found,
        "missing_keywords": not_found,
        "density_percentage": round(density, 1),
    }


def extract_keywords_from_jd(job_description: str) -> list:
    """
    Extract important keywords from a job description using TF-IDF,
    but FILTERED through the skill taxonomy to remove noise words.

    Args:
        job_description: The job description text.

    Returns:
        List of top keywords (only real skills/terms, no noise).
    """
    # Clean the text
    text = re.sub(r'[^a-zA-Z\s]', ' ', job_description.lower())
    text = re.sub(r'\s+', ' ', text).strip()

    vectorizer = TfidfVectorizer(
        stop_words='english',
        max_features=50,
        ngram_range=(1, 2),
    )

    try:
        tfidf_matrix = vectorizer.fit_transform([text])
        feature_names = vectorizer.get_feature_names_out()
        scores = tfidf_matrix.toarray()[0]

        keyword_scores = list(zip(feature_names, scores))
        keyword_scores.sort(key=lambda x: x[1], reverse=True)

        # Filter: only keep keywords that are real skills or meaningful technical terms
        # This prevents noise like "highly", "comma", "candidate hands"
        meaningful_keywords = []
        for kw, score in keyword_scores:
            if score <= 0:
                continue
            # Check if this keyword is a recognized skill
            if kw in SKILL_TAXONOMY:
                meaningful_keywords.append(kw)
                continue
            # Check if any taxonomy skill contains this keyword (partial match)
            is_skill_related = any(kw in skill or skill in kw for skill in SKILL_TAXONOMY if len(skill) > 2)
            if is_skill_related:
                meaningful_keywords.append(kw)

        return meaningful_keywords[:20]
    except Exception:
        return []


def compute_fallback_score(resume_text: str, job_description: str) -> dict:
    """
    Compute a complete fallback analysis using traditional ML techniques.
    This is used when the Gemini API is unavailable.

    Uses a HYBRID approach:
      1. Curated Skill Taxonomy matching (primary signal for skills_score)
      2. TF-IDF Cosine Similarity (supplementary signal for overall relevance)
      3. Keyword density analysis (for keyword_score)

    The score uses the same weighted formula as the Gemini engine:
    Score = (skills_score × 0.6) + (experience_score × 0.3) + (keyword_score × 0.1)

    Args:
        resume_text: Cleaned resume text.
        job_description: Job description text.

    Returns:
        Dictionary mimicking the Gemini response structure.
    """
    # ── Step 1: Extract real skills from both documents ──
    resume_skills = extract_skills_from_text(resume_text)
    jd_skills = extract_skills_from_text(job_description)

    # ── Step 2: Compute skill match ──
    skill_match = compute_skill_match(resume_skills, jd_skills)

    # ── Step 3: Cosine similarity for overall document relevance ──
    overall_similarity = compute_cosine_similarity(resume_text, job_description)

    # ── Step 4: Keyword density (filtered through taxonomy) ──
    jd_keywords = extract_keywords_from_jd(job_description)
    keyword_density = compute_keyword_density(resume_text, jd_keywords)

    # ── Step 5: Compute scores ──
    # Skills score: primarily from skill taxonomy match, boosted by cosine similarity
    skills_score = skill_match["match_percentage"] * 0.8 + (overall_similarity * 100) * 0.2

    # Experience score: use cosine similarity as a proxy for experience relevance
    # Boost if resume has more "extra" skills (indicates broader experience)
    experience_base = overall_similarity * 100
    extra_skill_bonus = min(len(skill_match["extra"]) * 3, 30)  # Up to 30 bonus points
    experience_score = min(experience_base + extra_skill_bonus, 100)

    # Keyword score: from keyword density analysis
    keyword_score = keyword_density["density_percentage"]

    # ── Step 6: Weighted formula (same as Gemini engine) ──
    match_score = (skills_score * 0.6) + (experience_score * 0.3) + (keyword_score * 0.1)

    # ── Step 7: Build response matching Gemini's structure ──
    return {
        "match_score": round(match_score, 1),
        "skills_score": round(skills_score, 1),
        "experience_score": round(experience_score, 1),
        "keyword_score": round(keyword_score, 1),
        "cosine_similarity": round(overall_similarity, 4),
        "matched_skills": skill_match["matched"],
        "missing_skills": [
            {
                "skill": skill,
                "importance": "high" if skill in SKILL_TAXONOMY else "medium",
                "suggestion": f"Consider adding '{skill}' to your resume"
            }
            for skill in skill_match["missing"][:10]
        ],
        "experience_analysis": {
            "required_years": None,
            "candidate_years": None,
            "match_percentage": round(experience_score, 1),
            "notes": "Estimated via ML cosine similarity + skill breadth analysis (Gemini unavailable)"
        },
        "strengths": [
            f"Strong skill alignment: {skill_match['total_matched']}/{skill_match['total_required']} required skills found",
            f"Document similarity: {round(overall_similarity * 100, 1)}% cosine similarity",
            f"Extra skills beyond requirements: {', '.join(skill_match['extra'][:5]) if skill_match['extra'] else 'None detected'}",
        ],
        "improvements": [
            f"Add missing skill: {skill}" for skill in skill_match["missing"][:5]
        ] if skill_match["missing"] else ["All required skills are present — great match!"],
        "rewritten_summary": f"ML Analysis: Candidate matches {skill_match['total_matched']} of {skill_match['total_required']} required skills. "
                             f"Overall document similarity is {round(overall_similarity * 100, 1)}%. "
                             f"Connect your Gemini API key for deeper AI-powered analysis with personalized recommendations.",
        "keyword_matches": keyword_density["found_keywords"],
        "ats_tips": [
            "Ensure all required skills from the job description are explicitly mentioned in your resume",
            "Use exact keyword phrases from the job description for ATS compatibility",
            "Include measurable achievements with specific numbers and outcomes",
            "Tailor your professional summary to match the role's key requirements",
        ],
        "_meta": {
            "model": "tfidf_cosine_skill_taxonomy",
            "latency_ms": 0,
        }
    }
