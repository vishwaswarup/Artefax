from pathlib import Path

from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

from app.schemas.artifacts import (
    AdvisoryContent,
    ExecutiveSummaryContent,
    LinkedInPostContent,
    OutputType,
    PresentationContent,
)

styles = getSampleStyleSheet()


def _bullets(items: list[str]):
    return [Paragraph(f"&bull; {item}", styles["Normal"]) for item in items]


def render_pdf(output_type: OutputType, content: dict, dest: Path) -> Path:
    doc = SimpleDocTemplate(
        str(dest),
        pagesize=LETTER,
        leftMargin=0.9 * inch,
        rightMargin=0.9 * inch,
        topMargin=0.9 * inch,
        bottomMargin=0.9 * inch,
    )
    story = []

    if output_type == OutputType.EXECUTIVE_SUMMARY:
        c = ExecutiveSummaryContent(**content)
        story += [Paragraph(c.headline, styles["Title"]), Spacer(1, 12)]
        story += [Paragraph(c.overview, styles["BodyText"]), Spacer(1, 16)]
        story += [Paragraph("Key Findings", styles["Heading2"])]
        story += _bullets(c.key_findings)
        story += [Spacer(1, 16), Paragraph("Recommendations", styles["Heading2"])]
        story += _bullets(c.recommendations)

    elif output_type == OutputType.LINKEDIN_POST:
        c = LinkedInPostContent(**content)
        story += [Paragraph(c.hook, styles["Title"]), Spacer(1, 12)]
        story += [Paragraph(c.body.replace("\n", "<br/>"), styles["BodyText"]), Spacer(1, 16)]
        story += [Paragraph(" ".join(f"#{h}" for h in c.hashtags), styles["Italic"])]

    elif output_type == OutputType.ADVISORY:
        c = AdvisoryContent(**content)
        story += [Paragraph(c.title, styles["Title"])]
        story += [Paragraph(f"Severity: <b>{c.severity}</b>", styles["Normal"]), Spacer(1, 12)]
        story += [Paragraph(c.summary, styles["BodyText"]), Spacer(1, 16)]
        story += [Paragraph("Affected Parties", styles["Heading2"])]
        story += _bullets(c.affected_parties)
        story += [Spacer(1, 16), Paragraph("Recommended Actions", styles["Heading2"])]
        story += _bullets(c.recommended_actions)

    elif output_type == OutputType.PRESENTATION:
        c = PresentationContent(**content)
        story += [Paragraph(c.title, styles["Title"]), Spacer(1, 16)]
        for i, slide in enumerate(c.slides, start=1):
            story += [Paragraph(f"Slide {i}: {slide.slide_title}", styles["Heading2"])]
            story += _bullets(slide.bullet_points)
            if slide.speaker_notes:
                story += [Paragraph(f"<i>Notes: {slide.speaker_notes}</i>", styles["Normal"])]
            story += [Spacer(1, 14)]

    doc.build(story)
    return dest
