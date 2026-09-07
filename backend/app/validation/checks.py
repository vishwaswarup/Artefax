from pydantic import BaseModel

from app.schemas.artifacts import (
    AdvisoryContent,
    ExecutiveSummaryContent,
    LinkedInPostContent,
    OutputType,
    PresentationContent,
)

MIN_LENGTHS = {
    "overview": 40,
    "summary": 20,
    "body": 40,
}


def validate_content(output_type: OutputType, content: BaseModel) -> list[str]:
    """Deterministic checks only: required fields present, non-empty,
    reasonable length. No re-prompting here — flag and move on.
    """
    notes: list[str] = []

    if output_type == OutputType.EXECUTIVE_SUMMARY:
        c: ExecutiveSummaryContent = content
        if not c.headline.strip():
            notes.append("headline is empty")
        if len(c.overview) < MIN_LENGTHS["overview"]:
            notes.append("overview is too short")
        if not c.key_findings:
            notes.append("no key_findings produced")

    elif output_type == OutputType.LINKEDIN_POST:
        c: LinkedInPostContent = content
        if not c.hook.strip():
            notes.append("hook is empty")
        if len(c.body) < MIN_LENGTHS["body"]:
            notes.append("body is too short")

    elif output_type == OutputType.ADVISORY:
        c: AdvisoryContent = content
        if not c.title.strip():
            notes.append("title is empty")
        if c.severity not in {"Low", "Medium", "High", "Critical"}:
            notes.append(f"unexpected severity value: {c.severity!r}")
        if len(c.summary) < MIN_LENGTHS["summary"]:
            notes.append("summary is too short")
        if not c.recommended_actions:
            notes.append("no recommended_actions produced")

    elif output_type == OutputType.PRESENTATION:
        c: PresentationContent = content
        if not c.title.strip():
            notes.append("title is empty")
        if not c.slides:
            notes.append("no slides produced")
        for i, slide in enumerate(c.slides):
            if not slide.bullet_points:
                notes.append(f"slide {i + 1} ('{slide.slide_title}') has no bullet points")

    return notes
