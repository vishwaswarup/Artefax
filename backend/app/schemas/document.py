from datetime import datetime, timezone
from enum import Enum

from pydantic import BaseModel, Field


class SourceType(str, Enum):
    PDF = "pdf"
    TEXT = "text"


class SourceInfo(BaseModel):
    source_type: SourceType
    filename: str | None = None
    stored_path: str | None = None


class Section(BaseModel):
    heading: str
    content: str
    order: int


class DocumentSemantics(BaseModel):
    """Structured output of the one Gemini semantic-analysis call."""

    title: str
    summary: str
    topics: list[str] = Field(default_factory=list)
    entities: list[str] = Field(default_factory=list)
    key_points: list[str] = Field(default_factory=list)
    claims: list[str] = Field(default_factory=list)


class DocumentStatus(str, Enum):
    UPLOADED = "uploaded"
    ANALYZING = "analyzing"
    ANALYZED = "analyzed"
    FAILED = "failed"


class CanonicalDocument(BaseModel):
    """The single canonical understanding of a source document.

    Built once during ingestion + analysis, then reused by every
    transformer instead of re-deriving understanding per output.
    """

    id: str
    source: SourceInfo
    raw_text: str
    sections: list[Section] = Field(default_factory=list)
    semantics: DocumentSemantics | None = None
    status: DocumentStatus = DocumentStatus.UPLOADED
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DocumentSummaryResponse(BaseModel):
    """What GET /documents/{id} returns to the frontend."""

    id: str
    status: DocumentStatus
    title: str | None = None
    summary: str | None = None
    topics: list[str] = Field(default_factory=list)
    entities: list[str] = Field(default_factory=list)
    key_points: list[str] = Field(default_factory=list)
    claims: list[str] = Field(default_factory=list)
