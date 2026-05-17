"""Pydantic models for all entities."""
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime


# ─── Auth ───────────────────────────────────────
class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2)
    username: str = Field(..., min_length=3)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: str = Field(default="user", pattern="^(user|company)$")

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


# ─── Profile ────────────────────────────────────
class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    headline: Optional[str] = None
    location: Optional[str] = None
    about: Optional[str] = None
    avatar: Optional[str] = None  # Base64 string
    cover_photo: Optional[str] = None  # Base64 string

class EducationItem(BaseModel):
    id: Optional[str] = None
    school: str = Field(..., min_length=1)
    degree: str = ""
    field_of_study: str = ""
    start_year: str = ""
    end_year: str = ""
    description: str = ""

class ExperienceItem(BaseModel):
    id: Optional[str] = None
    title: str = Field(..., min_length=1)
    company: str = Field(..., min_length=1)
    location: str = ""
    start_date: str = ""
    end_date: str = ""
    current: bool = False
    description: str = ""


# ─── Posts ──────────────────────────────────────
class CreatePostRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=3000)
    media: List[str] = []  # List of Base64 or URLs
    tags: List[str] = []

class CommentRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000)
    parent_id: Optional[str] = None


# ─── Jobs ───────────────────────────────────────

class FormFieldOption(BaseModel):
    """A single option for radio/checkbox/select fields."""
    label: str
    value: str = ""

class ApplicationFormField(BaseModel):
    """A single field in a custom application form."""
    id: Optional[str] = None
    type: str = "text"   # text, textarea, radio, checkbox, select, file
    label: str = ""
    required: bool = False
    options: List[FormFieldOption] = []  # For radio/checkbox/select

class CreateJobRequest(BaseModel):
    title: str = Field(..., min_length=3)
    description: str = Field(..., min_length=20)
    requirements: List[str] = []
    location: str = ""
    salary_range: str = ""
    job_type: str = "full-time"
    duration: str = ""  # e.g. "3 months", "6 months", "1 year", "Permanent"
    poster: Optional[str] = None  # Base64 string for job flyer/poster
    application_form: Optional[List[ApplicationFormField]] = None  # Custom form fields

class SubmitApplicationRequest(BaseModel):
    """When applying via custom form."""
    answers: dict = {}  # field_id -> answer value

class AnalysisResult(BaseModel):
    match_score: float = 0
    skills_score: float = 0
    experience_score: float = 0
    keyword_score: float = 0
    matched_skills: List[str] = []
    missing_skills: list = []
    experience_analysis: dict = {}
    strengths: List[str] = []
    improvements: List[str] = []
    rewritten_summary: str = ""
    keyword_matches: List[str] = []
    ats_tips: List[str] = []


# ─── Company ────────────────────────────────────
class UpdateCompanyRequest(BaseModel):
    industry: str = ""
    website: str = ""
    employee_count: int = 0
    description: str = ""
