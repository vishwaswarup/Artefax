from app.schemas.artifacts import ExecutiveSummaryContent, OutputType
from app.schemas.brief import ContentBrief
from app.transformation.base import BaseTransformer, register_transformer

PROMPT = """You are writing an Executive Summary based on the canonical \
understanding of a source document below. Do not invent facts beyond what \
is given.

Audience: {audience}
Tone: {tone}
Language: {language}
Detail level: {detail_level}
Objective: {objective}
Style: {style}

Document title: {title}
Document summary: {summary}
Topics: {topics}
Entities: {entities}
Key points: {key_points}
Claims: {claims}

Produce:
- headline: a short, punchy headline for the summary
- overview: a {detail_level}-length overview paragraph tailored to the audience and tone
- key_findings: the most important findings as short bullet strings
- recommendations: concrete recommended next steps as short bullet strings
"""


class ExecutiveSummaryTransformer(BaseTransformer):
    output_type = OutputType.EXECUTIVE_SUMMARY
    response_model = ExecutiveSummaryContent

    def build_prompt(self, brief: ContentBrief) -> str:
        s = brief.semantics
        c = brief.config
        return PROMPT.format(
            audience=c.audience.value,
            tone=c.tone.value,
            language=c.language,
            detail_level=c.detail_level.value,
            objective=c.objective.value,
            style=c.style.value,
            title=s.title,
            summary=s.summary,
            topics=", ".join(s.topics),
            entities=", ".join(s.entities),
            key_points="; ".join(s.key_points),
            claims="; ".join(s.claims),
        )


register_transformer(ExecutiveSummaryTransformer())
