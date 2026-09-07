import io
import re
import uuid

from pypdf import PdfReader

from app.schemas.document import CanonicalDocument, Section, SourceInfo, SourceType

# Naive section split: treat short lines (title-case-ish, no trailing period,
# under ~80 chars) as headings. Good enough for report-style PDFs; anything
# that doesn't match falls into a single "Body" section.
HEADING_PATTERN = re.compile(r"^[A-Z][A-Za-z0-9 ,&/\-]{3,80}$")


def extract_text_from_pdf(file_bytes: bytes) -> str:
    reader = PdfReader(io.BytesIO(file_bytes))
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n\n".join(pages).strip()


def split_into_sections(raw_text: str) -> list[Section]:
    lines = [line.strip() for line in raw_text.splitlines()]
    sections: list[Section] = []
    current_heading = "Introduction"
    current_lines: list[str] = []
    order = 0

    def flush():
        nonlocal current_lines, order
        content = "\n".join(current_lines).strip()
        if content:
            sections.append(Section(heading=current_heading, content=content, order=order))
            order += 1
        current_lines = []

    for line in lines:
        if not line:
            continue
        is_heading = (
            HEADING_PATTERN.match(line)
            and not line.endswith((".", ",", ";"))
            and len(line.split()) <= 10
        )
        if is_heading:
            flush()
            current_heading = line
        else:
            current_lines.append(line)
    flush()

    if not sections:
        sections.append(Section(heading="Full Text", content=raw_text.strip(), order=0))

    return sections


def build_canonical_document_from_pdf(file_bytes: bytes, filename: str) -> CanonicalDocument:
    raw_text = extract_text_from_pdf(file_bytes)
    if not raw_text:
        raise ValueError("No extractable text found in PDF.")
    return CanonicalDocument(
        id=str(uuid.uuid4()),
        source=SourceInfo(source_type=SourceType.PDF, filename=filename),
        raw_text=raw_text,
        sections=split_into_sections(raw_text),
    )


def build_canonical_document_from_text(raw_text: str) -> CanonicalDocument:
    raw_text = raw_text.strip()
    if not raw_text:
        raise ValueError("Pasted text is empty.")
    return CanonicalDocument(
        id=str(uuid.uuid4()),
        source=SourceInfo(source_type=SourceType.TEXT),
        raw_text=raw_text,
        sections=split_into_sections(raw_text),
    )
