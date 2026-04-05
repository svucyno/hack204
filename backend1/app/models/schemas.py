"""
Pydantic schemas for request validation and API responses.
"""

from datetime import date, datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


# --- Enums ---


class SkillLevel(str, Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"


class LearningStyle(str, Enum):
    visual = "visual"
    auditory = "auditory"
    reading = "reading"
    kinesthetic = "kinesthetic"


class QuestionType(str, Enum):
    mcq = "mcq"
    coding = "coding"


class ResourceType(str, Enum):
    video = "video"
    article = "article"
    quiz = "quiz"
    project = "project"


# --- Auth (for route dependencies / future JWT payloads) ---


class TokenPayload(BaseModel):
    sub: str
    exp: Optional[int] = None
    role: str = "learner"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=256)


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=256)
    full_name: str = Field(min_length=1, max_length=200)


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class DevTokenRequest(BaseModel):
    """Development-only helper to mint JWTs when full auth stack is not wired."""

    user_id: str = Field(min_length=1, max_length=128)
    role: str = Field(default="learner", max_length=32)


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int


# --- Profile ---


class ProfileUpsert(BaseModel):
    educational_background: Optional[str] = None
    current_skill_level: SkillLevel = SkillLevel.beginner
    interests: List[str] = Field(default_factory=list)
    learning_speed: float = Field(default=1.0, ge=0.1, le=3.0)
    preferred_learning_style: LearningStyle = LearningStyle.visual
    goals: List[str] = Field(default_factory=list)
    target_completion_date: Optional[date] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None

class ProfileRead(ProfileUpsert):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    updated_at: datetime


# --- Learning path ---


class ModuleNode(BaseModel):
    topic_id: str
    title: str
    estimated_hours: float = Field(ge=0)
    prerequisites: List[str] = Field(default_factory=list)
    order_index: int = 0


class LearningPathCreate(BaseModel):
    goal_summary: str = Field(min_length=1, max_length=2000)
    topics_available: List[str] = Field(default_factory=list)


class LearningPathRead(BaseModel):
    path_id: str
    user_id: str
    goal_summary: str
    modules: List[ModuleNode]
    total_estimated_hours: float
    daily_roadmap: List[Dict[str, Any]]
    milestones: List[str]
    generated_at: datetime
    version: int = 1


class PathRegenerateRequest(BaseModel):
    path_id: str
    reason: Optional[str] = None
    recent_quiz_scores: Optional[List[float]] = None


# --- Quiz / Assessment ---


class QuestionOption(BaseModel):
    id: str
    text: str


class QuestionItem(BaseModel):
    question_id: str
    topic_id: str
    type: QuestionType
    prompt: str
    options: Optional[List[QuestionOption]] = None
    difficulty: float = Field(default=0.5, ge=0, le=1)
    starter_code: Optional[str] = None


class QuizGenerateRequest(BaseModel):
    topic_ids: List[str] = Field(min_length=1)
    num_questions: int = Field(default=10, ge=1, le=50)
    include_coding: bool = False


class QuizSessionRead(BaseModel):
    session_id: str
    user_id: str
    questions: List[QuestionItem]
    started_at: datetime


class AnswerSubmit(BaseModel):
    session_id: str
    question_id: str
    selected_option_id: Optional[str] = None
    code_submission: Optional[str] = None

    @model_validator(mode="after")
    def require_one_answer(self) -> "AnswerSubmit":
        if not self.selected_option_id and not self.code_submission:
            raise ValueError("Either selected_option_id or code_submission is required")
        return self


class QuizResultRead(BaseModel):
    session_id: str
    score_percent: float
    topic_breakdown: Dict[str, float]
    weak_topics: List[str]
    classified_level: SkillLevel
    completed_at: datetime


# --- Analysis ---


class AnalyticsQuery(BaseModel):
    user_id: str
    days: int = Field(default=30, ge=1, le=365)


class TimeAnalytics(BaseModel):
    total_minutes: float
    by_topic: Dict[str, float]
    streak_days: int


class MasteryPoint(BaseModel):
    topic_id: str
    mastery: float = Field(ge=0, le=1)


class WeaknessRadar(BaseModel):
    topic_id: str
    weakness_score: float = Field(ge=0, le=1)


class DashboardAnalytics(BaseModel):
    user_id: str
    completion_percent: float
    learning_streak_days: int
    topic_mastery: List[MasteryPoint]
    weakness_radar: List[WeaknessRadar]
    time_analytics: TimeAnalytics
    confidence_score: float = Field(ge=0, le=1)


# --- Recommendations ---


class RecommendationItem(BaseModel):
    resource_id: str
    title: str
    type: ResourceType
    topic_id: str
    url: Optional[str] = None
    score: float = Field(ge=0, le=1)
    rationale: str


class RecommendRequest(BaseModel):
    limit: int = Field(default=10, ge=1, le=50)
    topic_focus: Optional[str] = None


class RecommendResponse(BaseModel):
    user_id: str
    items: List[RecommendationItem]
    next_best_topic: Optional[str] = None


# --- Pagination ---


class PaginatedMeta(BaseModel):
    page: int
    page_size: int
    total: int


class PaginatedUsers(BaseModel):
    items: List[Dict[str, Any]]
    meta: PaginatedMeta


# --- API envelope ---


class ErrorDetail(BaseModel):
    code: str
    message: str
    field: Optional[str] = None


class APIError(BaseModel):
    error: ErrorDetail


# --- Auth extensions ---


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=10)
    new_password: str = Field(min_length=8, max_length=256)


class RefreshRequest(BaseModel):
    refresh_token: str


class GoogleAuthRequest(BaseModel):
    id_token: str = Field(min_length=10)


class UserPublic(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    oauth_provider: str


class MeResponse(BaseModel):
    user: UserPublic
    profile: Optional[ProfileRead] = None


class NotificationRead(BaseModel):
    id: str
    title: str
    body: str
    kind: str
    read: bool
    created_at: datetime


class ChatMessageRequest(BaseModel):
    message: str = Field(min_length=1, max_length=8000)
    topic_hint: Optional[str] = None


class ChatMessageResponse(BaseModel):
    reply: str


class CourseCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    description: Optional[str] = None
    provider: str = Field(default="custom", max_length=64)
    external_url: Optional[str] = None
    skill_tags: List[str] = Field(default_factory=list)


class CourseRead(CourseCreate):
    model_config = ConfigDict(from_attributes=True)

    id: str
    is_published: bool
    created_at: datetime


class AdminStatsResponse(BaseModel):
    total_users: int
    active_learners_7d: int
    assessments_completed_7d: int
    paths_created_7d: int
