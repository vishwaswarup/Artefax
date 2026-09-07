from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.rendering import render_artifact
from app.storage.db import artifact_from_row, get_artifact_row

router = APIRouter(prefix="/api/artifacts", tags=["export"])

MEDIA_TYPES = {
    "pdf": "application/pdf",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "txt": "text/plain",
}


@router.get("/{artifact_id}/export")
def export_artifact(artifact_id: str, format: str):
    row = get_artifact_row(artifact_id)
    if row is None:
        raise HTTPException(404, "Artifact not found.")
    artifact = artifact_from_row(row)
    if format not in MEDIA_TYPES:
        raise HTTPException(400, f"Unsupported format: {format}")

    try:
        path = render_artifact(artifact.id, artifact.output_type, artifact.content, format)
    except ValueError as e:
        raise HTTPException(400, str(e))

    return FileResponse(
        path,
        media_type=MEDIA_TYPES[format],
        filename=f"{artifact.output_type.value}_{artifact.id[:8]}.{format}",
    )
