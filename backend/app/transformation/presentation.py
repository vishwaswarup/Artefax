from app.schemas.artifacts import OutputType, PresentationContent
from app.schemas.brief import ContentBrief
from app.transformation.base import BaseTransformer, register_transformer

PROMPT = """You are outlining a presentation deck based on the canonical \
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

Produce a presentation with:
- title: the deck's title
- slides: 5-8 slides, each with:
  - slide_title: short slide title
  - bullet_points: 3-5 short bullet strings for the slide
  - speaker_notes: 1-3 sentences a presenter would say for this slide
"""


class PresentationTransformer(BaseTransformer):
    output_type = OutputType.PRESENTATION
    response_model = PresentationContent

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


register_transformer(PresentationTransformer())
