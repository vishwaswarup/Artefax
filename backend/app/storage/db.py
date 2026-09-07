import json
import sqlite3
from contextlib import contextmanager

from app.config import DB_PATH
from app.schemas.artifacts import ArtifactStatus, OutputArtifact, OutputType
from app.schemas.document import (
    CanonicalDocument,
    DocumentSemantics,
    DocumentStatus,
    Section,
    SourceInfo,
    SourceType,
)

SCHEMA = """
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    source_type TEXT NOT NULL,
    filename TEXT,
    stored_path TEXT,
    raw_text TEXT NOT NULL,
    sections_json TEXT NOT NULL,
    semantics_json TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS artifacts (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    output_type TEXT NOT NULL,
    status TEXT NOT NULL,
    content_json TEXT NOT NULL,
    validation_notes_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (document_id) REFERENCES documents (id)
);
"""


@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with get_conn() as conn:
        conn.executescript(SCHEMA)


def save_document(doc) -> None:
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO documents
                (id, status, source_type, filename, stored_path, raw_text,
                 sections_json, semantics_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                status=excluded.status,
                semantics_json=excluded.semantics_json
            """,
            (
                doc.id,
                doc.status.value,
                doc.source.source_type.value,
                doc.source.filename,
                doc.source.stored_path,
                doc.raw_text,
                json.dumps([s.model_dump() for s in doc.sections]),
                json.dumps(doc.semantics.model_dump()) if doc.semantics else None,
                doc.created_at.isoformat(),
            ),
        )


def get_document_row(document_id: str) -> sqlite3.Row | None:
    with get_conn() as conn:
        cur = conn.execute("SELECT * FROM documents WHERE id = ?", (document_id,))
        return cur.fetchone()


def save_artifact(artifact) -> None:
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO artifacts
                (id, document_id, output_type, status, content_json,
                 validation_notes_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                status=excluded.status,
                content_json=excluded.content_json,
                validation_notes_json=excluded.validation_notes_json
            """,
            (
                artifact.id,
                artifact.document_id,
                artifact.output_type.value,
                artifact.status.value,
                json.dumps(artifact.content),
                json.dumps(artifact.validation_notes),
                artifact.created_at.isoformat(),
            ),
        )


def get_artifact_row(artifact_id: str) -> sqlite3.Row | None:
    with get_conn() as conn:
        cur = conn.execute("SELECT * FROM artifacts WHERE id = ?", (artifact_id,))
        return cur.fetchone()


def list_artifact_rows_for_document(document_id: str) -> list[sqlite3.Row]:
    with get_conn() as conn:
        cur = conn.execute(
            "SELECT * FROM artifacts WHERE document_id = ? ORDER BY created_at",
            (document_id,),
        )
        return cur.fetchall()


def document_from_row(row: sqlite3.Row) -> CanonicalDocument:
    semantics = None
    if row["semantics_json"]:
        semantics = DocumentSemantics(**json.loads(row["semantics_json"]))
    return CanonicalDocument(
        id=row["id"],
        status=DocumentStatus(row["status"]),
        source=SourceInfo(
            source_type=SourceType(row["source_type"]),
            filename=row["filename"],
            stored_path=row["stored_path"],
        ),
        raw_text=row["raw_text"],
        sections=[Section(**s) for s in json.loads(row["sections_json"])],
        semantics=semantics,
        created_at=row["created_at"],
    )


def artifact_from_row(row: sqlite3.Row) -> OutputArtifact:
    return OutputArtifact(
        id=row["id"],
        document_id=row["document_id"],
        output_type=OutputType(row["output_type"]),
        status=ArtifactStatus(row["status"]),
        content=json.loads(row["content_json"]),
        validation_notes=json.loads(row["validation_notes_json"]),
        created_at=row["created_at"],
    )
