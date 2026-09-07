from pathlib import Path

from app.schemas.artifacts import (
    AdvisoryContent,
    ExecutiveSummaryContent,
    LinkedInPostContent,
    OutputType,
    PresentationContent,
)


def render_txt(output_type: OutputType, content: dict, dest: Path) -> Path:
    lines: list[str] = []

    if output_type == OutputType.EXECUTIVE_SUMMARY:
        c = ExecutiveSummaryContent(**content)
        lines += [c.headline, "", c.overview, "", "Key Findings:"]
        lines += [f"- {p}" for p in c.key_findings]
        lines += ["", "Recommendations:"]
        lines += [f"- {p}" for p in c.recommendations]

    elif output_type == OutputType.LINKEDIN_POST:
        c = LinkedInPostContent(**content)
        lines += [c.hook, "", c.body, "", " ".join(f"#{h}" for h in c.hashtags)]

    elif output_type == OutputType.ADVISORY:
        c = AdvisoryContent(**content)
        lines += [c.title, f"Severity: {c.severity}", "", c.summary, "", "Affected Parties:"]
        lines += [f"- {p}" for p in c.affected_parties]
        lines += ["", "Recommended Actions:"]
        lines += [f"- {p}" for p in c.recommended_actions]

    elif output_type == OutputType.PRESENTATION:
        c = PresentationContent(**content)
        lines += [c.title, ""]
        for i, slide in enumerate(c.slides, start=1):
            lines += [f"Slide {i}: {slide.slide_title}"]
            lines += [f"  - {b}" for b in slide.bullet_points]
            if slide.speaker_notes:
                lines += [f"  Notes: {slide.speaker_notes}"]
            lines += [""]

    dest.write_text("\n".join(lines), encoding="utf-8")
    return dest
