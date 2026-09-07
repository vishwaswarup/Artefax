// NEXT_PUBLIC_API_URL may be a bare host (some hosting providers only
// expose the hostname, not a full URL, via inter-service env var
// references) or a full "https://..." URL — normalize to a full URL.
const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_URL = RAW_API_URL.includes("://")
  ? RAW_API_URL.replace(/\/$/, "")
  : `https://${RAW_API_URL.replace(/\/$/, "")}`;

export type Audience = "executive" | "technical" | "general_public" | "investor";
export type Tone = "formal" | "conversational" | "urgent" | "neutral";
export type DetailLevel = "brief" | "standard" | "detailed";
export type Objective = "inform" | "persuade" | "warn" | "update_status";
export type Style = "narrative" | "bullet_points" | "structured";

export interface GenerationConfig {
  audience: Audience;
  tone: Tone;
  language: string;
  detail_level: DetailLevel;
  objective: Objective;
  style: Style;
}

export type OutputType =
  | "executive_summary"
  | "linkedin_post"
  | "advisory"
  | "presentation";

export type DocumentStatus = "uploaded" | "analyzing" | "analyzed" | "failed";

export interface DocumentSummary {
  id: string;
  status: DocumentStatus;
  title: string | null;
  summary: string | null;
  topics: string[];
  entities: string[];
  key_points: string[];
  claims: string[];
}

export type ArtifactStatus = "pending" | "generated" | "flagged" | "failed";

export interface Artifact {
  id: string;
  document_id: string;
  output_type: OutputType;
  status: ArtifactStatus;
  content: Record<string, unknown>;
  validation_notes: string[];
  available_formats: string[];
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      // ignore parse failure
    }
    throw new Error(detail);
  }
  return res.json();
}

export async function uploadFile(file: File): Promise<{ document_id: string; status: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_URL}/api/documents`, { method: "POST", body: formData });
  return handle(res);
}

export async function uploadText(text: string): Promise<{ document_id: string; status: string }> {
  const formData = new FormData();
  formData.append("text", text);
  const res = await fetch(`${API_URL}/api/documents`, { method: "POST", body: formData });
  return handle(res);
}

export async function getDocument(documentId: string): Promise<DocumentSummary> {
  const res = await fetch(`${API_URL}/api/documents/${documentId}`);
  return handle(res);
}

export async function generateOutputs(
  documentId: string,
  outputs: OutputType[],
  config: GenerationConfig
): Promise<{ artifact_ids: string[] }> {
  const res = await fetch(`${API_URL}/api/documents/${documentId}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ outputs, config }),
  });
  return handle(res);
}

export async function listArtifacts(documentId: string): Promise<Artifact[]> {
  const res = await fetch(`${API_URL}/api/documents/${documentId}/artifacts`);
  return handle(res);
}

export function exportUrl(artifactId: string, format: string): string {
  return `${API_URL}/api/artifacts/${artifactId}/export?format=${format}`;
}
