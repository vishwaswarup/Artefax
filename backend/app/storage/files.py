from pathlib import Path

from app.config import ARTIFACTS_DIR, UPLOADS_DIR


def save_upload(document_id: str, filename: str, file_bytes: bytes) -> str:
    dest = UPLOADS_DIR / f"{document_id}_{filename}"
    dest.write_bytes(file_bytes)
    return str(dest)


def artifact_export_path(artifact_id: str, fmt: str) -> Path:
    return ARTIFACTS_DIR / f"{artifact_id}.{fmt}"
