from app.intelligence.gemini_client import generate_structured
from app.schemas.document import DocumentSemantics

ANALYSIS_PROMPT = """You are analyzing a source document to build a single \
canonical understanding of it that will be reused to generate several \
different downstream outputs (executive summary, LinkedIn post, advisory, \
presentation). Extract the following from the document text below, staying \
strictly grounded in what the document actually says:

- title: a concise descriptive title for the document
- summary: a neutral 3-5 sentence summary of the whole document
- topics: the main topics/themes covered (short phrases)
- entities: named people, organizations, systems, or products mentioned
- key_points: the most important individual facts or takeaways
- claims: specific factual claims or findings stated in the document

Document text:
---
{raw_text}
---
"""


def analyze_document(raw_text: str) -> DocumentSemantics:
    prompt = ANALYSIS_PROMPT.format(raw_text=raw_text[:20000])
    return generate_structured(prompt, DocumentSemantics)
