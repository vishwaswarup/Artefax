from app.schemas.artifacts import LinkedInPostContent, OutputType
from app.schemas.brief import ContentBrief
from app.transformation.base import BaseTransformer, register_transformer

PROMPT = """You are writing a LinkedIn post based on the canonical \
understanding of a source document below. Do not invent facts beyond what \
is given. Keep it native to LinkedIn's format (short paragraphs, no markdown).

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
- hook: a one-line attention-grabbing opening
- body: the main post body (a few short paragraphs, no hashtags inline)
- hashtags: 3-6 relevant hashtags, without the # symbol
"""


class LinkedInTransformer(BaseTransformer):
    output_type = OutputType.LINKEDIN_POST
    response_model = LinkedInPostContent

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


register_transformer(LinkedInTransformer())
