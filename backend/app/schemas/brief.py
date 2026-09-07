from enum import Enum

from pydantic import BaseModel

from app.schemas.document import DocumentSemantics


class Audience(str, Enum):
    EXECUTIVE = "executive"
    TECHNICAL = "technical"
    GENERAL_PUBLIC = "general_public"
    INVESTOR = "investor"


class Tone(str, Enum):
    FORMAL = "formal"
    CONVERSATIONAL = "conversational"
    URGENT = "urgent"
    NEUTRAL = "neutral"


class DetailLevel(str, Enum):
    BRIEF = "brief"
    STANDARD = "standard"
    DETAILED = "detailed"


class Objective(str, Enum):
    INFORM = "inform"
    PERSUADE = "persuade"
    WARN = "warn"
    UPDATE_STATUS = "update_status"


class Style(str, Enum):
    NARRATIVE = "narrative"
    BULLET_POINTS = "bullet_points"
    STRUCTURED = "structured"


class GenerationConfig(BaseModel):
    audience: Audience = Audience.EXECUTIVE
    tone: Tone = Tone.FORMAL
    language: str = "English"
    detail_level: DetailLevel = DetailLevel.STANDARD
    objective: Objective = Objective.INFORM
    style: Style = Style.STRUCTURED


class ContentBrief(BaseModel):
    """Combines the canonical semantics with the user's chosen output
    parameters. This is what every transformer receives — no transformer
    re-reads the raw document or re-derives understanding.
    """

    document_id: str
    semantics: DocumentSemantics
    config: GenerationConfig
