from datetime import datetime, timezone
from enum import Enum

from pydantic import BaseModel, Field


class OutputType(str, Enum):
    EXECUTIVE_SUMMARY = "executive_summary"
    LINKEDIN_POST = "linkedin_post"
    ADVISORY = "advisory"
    PRESENTATION = "presentation"


class ArtifactStatus(str, Enum):
    PENDING = "pending"
    GENERATED = "generated"
    FLAGGED = "flagged"
    FAILED = "failed"


# ---- Typed content schemas, one per output type ----
# Each is the Gemini structured-output response_schema for its transformer.
# Rendering code turns these into files deterministically — the model
# never produces PDF/PPTX structure directly.


class ExecutiveSummaryContent(BaseModel):
    headline: str
    overview: str
    key_findings: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)


class LinkedInPostContent(BaseModel):
    hook: str
    body: str
    hashtags: list[str] = Field(default_factory=list)


class AdvisoryContent(BaseModel):
    title: str
    severity: str
    summary: str
    affected_parties: list[str] = Field(default_factory=list)
    recommended_actions: list[str] = Field(default_factory=list)


class PresentationSlide(BaseModel):
    slide_title: str
    bullet_points: list[str] = Field(default_factory=list)
    speaker_notes: str


class PresentationContent(BaseModel):
    title: str
    slides: list[PresentationSlide] = Field(default_factory=list)


ArtifactContent = (
    ExecutiveSummaryContent | LinkedInPostContent | AdvisoryContent | PresentationContent
)


class OutputArtifact(BaseModel):
    id: str
    document_id: str
    output_type: OutputType
    status: ArtifactStatus
    content: dict = Field(default_factory=dict)
    validation_notes: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ArtifactResponse(BaseModel):
    id: str
    document_id: str
    output_type: OutputType
    status: ArtifactStatus
    content: dict
    validation_notes: list[str] = Field(default_factory=list)
    available_formats: list[str] = Field(default_factory=list)
