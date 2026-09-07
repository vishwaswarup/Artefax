from pathlib import Path

from app.schemas.artifacts import OutputType
from app.storage.files import artifact_export_path

from .pdf import render_pdf
from .pptx import render_pptx
from .txt import render_txt

AVAILABLE_FORMATS: dict[OutputType, list[str]] = {
    OutputType.EXECUTIVE_SUMMARY: ["pdf", "txt"],
    OutputType.LINKEDIN_POST: ["txt"],
    OutputType.ADVISORY: ["pdf", "txt"],
    OutputType.PRESENTATION: ["pptx", "txt"],
}


def render_artifact(
    artifact_id: str, output_type: OutputType, content: dict, fmt: str
) -> Path:
    if fmt not in AVAILABLE_FORMATS.get(output_type, []):
        raise ValueError(f"Format '{fmt}' is not available for output type '{output_type.value}'.")

    dest = artifact_export_path(artifact_id, fmt)
    if fmt == "pdf":
        return render_pdf(output_type, content, dest)
    if fmt == "pptx":
        return render_pptx(output_type, content, dest)
    if fmt == "txt":
        return render_txt(output_type, content, dest)
    raise ValueError(f"Unsupported format: {fmt}")
