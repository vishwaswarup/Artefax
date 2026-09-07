from app.schemas.artifacts import AdvisoryContent, OutputType
from app.schemas.brief import ContentBrief
from app.transformation.base import BaseTransformer, register_transformer

PROMPT = """You are writing a formal Advisory notice based on the canonical \
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
- title: the advisory's title
- severity: one of "Low", "Medium", "High", "Critical" based on the document's content
- summary: a {detail_level}-length summary of the situation
- affected_parties: who or what is affected, as short strings
- recommended_actions: concrete recommended actions as short bullet strings
"""


class AdvisoryTransformer(BaseTransformer):
    output_type = OutputType.ADVISORY
    response_model = AdvisoryContent

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


register_transformer(AdvisoryTransformer())
