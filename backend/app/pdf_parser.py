"""
Module C: PDF Parser — The Data Extraction Engine
Extracts text from PDF files and cleans it for AI processing.
Uses PyMuPDF (fitz) for reliable, fast text extraction.
"""

import re
import fitz  # PyMuPDF


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """
    Extract raw text from a PDF file's bytes.

    Args:
        pdf_bytes: The raw bytes of the uploaded PDF file.

    Returns:
        Cleaned, concatenated text from all pages.
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    text_blocks = []

    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        text = page.get_text("text")
        if text.strip():
            text_blocks.append(text)

    doc.close()
    raw_text = "\n".join(text_blocks)
    return clean_text(raw_text)


def clean_text(text: str) -> str:
    """
    Clean extracted text by removing noise and formatting artifacts.

    Steps:
        1. Remove non-ASCII characters
        2. Normalize whitespace
        3. Remove excessive newlines
        4. Strip leading/trailing whitespace
    """
    # Remove non-ASCII characters (keep basic punctuation)
    text = re.sub(r'[^\x00-\x7F]+', ' ', text)

    # Normalize multiple spaces to single space
    text = re.sub(r' {2,}', ' ', text)

    # Normalize multiple newlines to double newline (paragraph break)
    text = re.sub(r'\n{3,}', '\n\n', text)

    # Remove leading/trailing whitespace per line
    lines = [line.strip() for line in text.split('\n')]
    text = '\n'.join(lines)

    return text.strip()


def extract_sections(text: str) -> dict:
    """
    Use regex to identify common resume sections.
    This helps the AI focus on relevant parts.

    Returns:
        Dictionary mapping section names to their content.
    """
    section_patterns = [
        r'(?i)(education|academic)',
        r'(?i)(experience|employment|work\s*history)',
        r'(?i)(skills|technical\s*skills|competencies)',
        r'(?i)(projects|portfolio)',
        r'(?i)(certifications?|certificates?)',
        r'(?i)(summary|objective|profile)',
        r'(?i)(awards?|achievements?|honors?)',
        r'(?i)(languages?)',
        r'(?i)(references?)',
    ]

    sections = {}
    lines = text.split('\n')

    current_section = "header"
    sections[current_section] = []

    for line in lines:
        matched = False
        for pattern in section_patterns:
            if re.match(pattern, line.strip()):
                current_section = line.strip().lower()
                sections[current_section] = []
                matched = True
                break
        if not matched:
            if current_section not in sections:
                sections[current_section] = []
            sections[current_section].append(line)

    # Join lines back into strings
    for key in sections:
        sections[key] = '\n'.join(sections[key]).strip()

    # Remove empty sections
    sections = {k: v for k, v in sections.items() if v}

    return sections


def extract_skills_from_text(text: str) -> list:
    """
    Extract a rough list of skills using keyword matching.
    Used as a fallback / supplement to the AI extraction.
    """
    common_skills = [
        "python", "java", "javascript", "typescript", "c++", "c#", "go", "rust",
        "react", "angular", "vue", "node.js", "express", "django", "flask", "fastapi",
        "sql", "nosql", "mongodb", "postgresql", "mysql", "redis",
        "docker", "kubernetes", "aws", "azure", "gcp", "terraform",
        "git", "ci/cd", "jenkins", "github actions",
        "machine learning", "deep learning", "nlp", "tensorflow", "pytorch",
        "html", "css", "tailwind", "bootstrap",
        "rest api", "graphql", "microservices",
        "agile", "scrum", "jira",
        "flutter", "dart", "swift", "kotlin", "react native",
        "figma", "photoshop", "illustrator",
        "linux", "bash", "powershell",
        "data analysis", "pandas", "numpy", "matplotlib",
    ]

    text_lower = text.lower()
    found_skills = []

    for skill in common_skills:
        if skill in text_lower:
            found_skills.append(skill)

    return found_skills


def estimate_experience_years(text: str) -> int:
    """
    Estimate years of experience from resume text using regex.
    Looks for patterns like "5+ years", "3 years of experience", etc.
    """
    patterns = [
        r'(\d+)\+?\s*years?\s*(?:of\s*)?(?:experience|exp)',
        r'(\d+)\+?\s*years?\s*(?:in|of|working)',
        r'experience.*?(\d+)\+?\s*years?',
    ]

    years = []
    text_lower = text.lower()

    for pattern in patterns:
        matches = re.findall(pattern, text_lower)
        years.extend([int(y) for y in matches])

    return max(years) if years else 0
