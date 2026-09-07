from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.ingestion.extract import (
    build_canonical_document_from_pdf,
    build_canonical_document_from_text,
)
from app.intelligence.analyzer import analyze_document
from app.schemas.document import DocumentStatus, DocumentSummaryResponse
from app.storage.db import document_from_row, get_document_row, save_document
from app.storage.files import save_upload

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.post("")
async def upload_document(
    file: UploadFile | None = File(default=None),
    text: str | None = Form(default=None),
):
    if file is None and not text:
        raise HTTPException(400, "Provide either a file upload or pasted text.")

    try:
        if file is not None:
            file_bytes = await file.read()
            doc = build_canonical_document_from_pdf(file_bytes, file.filename or "upload.pdf")
            doc.source.stored_path = save_upload(doc.id, file.filename or "upload.pdf", file_bytes)
        else:
            doc = build_canonical_document_from_text(text)
    except ValueError as e:
        raise HTTPException(400, str(e))

    save_document(doc)

    try:
        doc.semantics = analyze_document(doc.raw_text)
        doc.status = DocumentStatus.ANALYZED
    except Exception as e:
        doc.status = DocumentStatus.FAILED
        save_document(doc)
        raise HTTPException(502, f"Analysis failed: {e}")

    save_document(doc)
    return {"document_id": doc.id, "status": doc.status.value}


@router.get("/{document_id}", response_model=DocumentSummaryResponse)
def get_document(document_id: str):
    row = get_document_row(document_id)
    if row is None:
        raise HTTPException(404, "Document not found.")
    doc = document_from_row(row)
    s = doc.semantics
    return DocumentSummaryResponse(
        id=doc.id,
        status=doc.status,
        title=s.title if s else None,
        summary=s.summary if s else None,
        topics=s.topics if s else [],
        entities=s.entities if s else [],
        key_points=s.key_points if s else [],
        claims=s.claims if s else [],
    )
