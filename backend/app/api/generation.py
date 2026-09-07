import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.rendering import AVAILABLE_FORMATS
from app.schemas.artifacts import ArtifactResponse, ArtifactStatus, OutputArtifact, OutputType
from app.schemas.brief import ContentBrief, GenerationConfig
from app.storage.db import (
    artifact_from_row,
    document_from_row,
    get_document_row,
    list_artifact_rows_for_document,
    save_artifact,
)
from app.transformation import get_transformer
from app.validation.checks import validate_content

router = APIRouter(prefix="/api", tags=["generation"])


class GenerateRequest(BaseModel):
    outputs: list[OutputType]
    config: GenerationConfig = GenerationConfig()


@router.post("/documents/{document_id}/generate")
def generate(document_id: str, request: GenerateRequest):
    row = get_document_row(document_id)
    if row is None:
        raise HTTPException(404, "Document not found.")
    doc = document_from_row(row)
    if doc.semantics is None:
        raise HTTPException(400, "Document has not finished analysis yet.")

    artifact_ids = []
    for output_type in request.outputs:
        brief = ContentBrief(document_id=doc.id, semantics=doc.semantics, config=request.config)
        transformer = get_transformer(output_type)

        artifact_id = str(uuid.uuid4())
        try:
            result = transformer.generate(brief)
            notes = validate_content(output_type, result)
            status = ArtifactStatus.FLAGGED if notes else ArtifactStatus.GENERATED
            artifact = OutputArtifact(
                id=artifact_id,
                document_id=doc.id,
                output_type=output_type,
                status=status,
                content=result.model_dump(),
                validation_notes=notes,
            )
        except Exception as e:
            artifact = OutputArtifact(
                id=artifact_id,
                document_id=doc.id,
                output_type=output_type,
                status=ArtifactStatus.FAILED,
                content={},
                validation_notes=[str(e)],
            )

        save_artifact(artifact)
        artifact_ids.append(artifact.id)

    return {"artifact_ids": artifact_ids}


@router.get("/documents/{document_id}/artifacts", response_model=list[ArtifactResponse])
def list_artifacts(document_id: str):
    rows = list_artifact_rows_for_document(document_id)
    responses = []
    for row in rows:
        artifact = artifact_from_row(row)
        responses.append(
            ArtifactResponse(
                id=artifact.id,
                document_id=artifact.document_id,
                output_type=artifact.output_type,
                status=artifact.status,
                content=artifact.content,
                validation_notes=artifact.validation_notes,
                available_formats=AVAILABLE_FORMATS.get(artifact.output_type, []),
            )
        )
    return responses
