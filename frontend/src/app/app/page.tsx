"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Artifact,
  DocumentSummary,
  GenerationConfig,
  OutputType,
  exportUrl,
  generateOutputs,
  getDocument,
  listArtifacts,
  uploadFile,
  uploadText,
} from "@/lib/api";

const OUTPUT_LABELS: Record<OutputType, string> = {
  executive_summary: "Executive Summary",
  linkedin_post: "LinkedIn Post",
  advisory: "Advisory",
  presentation: "Presentation",
};

const FORMAT_LABELS: Record<string, string> = {
  pdf: "PDF",
  pptx: "PPTX",
  txt: "TXT",
};

// Language is not exposed in the UI (kept simple for the demo) — every
// request is sent with this fixed value. The backend field itself is a
// free-form string with no server-side enum, so this is UI-only.
const FIXED_LANGUAGE = "English";

const DEFAULT_CONFIG: GenerationConfig = {
  audience: "executive",
  tone: "formal",
  language: FIXED_LANGUAGE,
  detail_level: "standard",
  objective: "inform",
  style: "structured",
};

export default function AppPage() {
  const [pastedText, setPastedText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const [doc, setDoc] = useState<DocumentSummary | null>(null);

  const [selectedOutputs, setSelectedOutputs] = useState<Set<OutputType>>(
    new Set(["executive_summary"])
  );
  const [config, setConfig] = useState<GenerationConfig>(DEFAULT_CONFIG);
  const [generating, setGenerating] = useState(false);

  const [artifacts, setArtifacts] = useState<Artifact[]>([]);

  async function handleUploadFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const { document_id } = await uploadFile(file);
      const summary = await getDocument(document_id);
      setDoc(summary);
      setArtifacts([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleUploadText() {
    if (!pastedText.trim()) return;
    setUploading(true);
    setError(null);
    try {
      const { document_id } = await uploadText(pastedText);
      const summary = await getDocument(document_id);
      setDoc(summary);
      setArtifacts([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function toggleOutput(output: OutputType) {
    setSelectedOutputs((prev) => {
      const next = new Set(prev);
      if (next.has(output)) next.delete(output);
      else next.add(output);
      return next;
    });
  }

  async function handleGenerate() {
    if (!doc || selectedOutputs.size === 0) return;
    setGenerating(true);
    setError(null);
    try {
      // language is always sent as FIXED_LANGUAGE — see DEFAULT_CONFIG.
      await generateOutputs(doc.id, Array.from(selectedOutputs), config);
      const list = await listArtifacts(doc.id);
      setArtifacts(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto w-full px-6 py-10 flex flex-col gap-10">
      <header className="border-b border-neutral-800 pb-6 relative">
        <div className="absolute inset-x-0 -top-10 h-px bg-gradient-to-r from-transparent via-neutral-600 to-transparent" />
        <Link href="/" className="block cursor-pointer w-fit group">
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold tracking-tight text-neutral-50 transition-colors group-hover:text-neutral-300">
              ARTEFA<span className="text-accent">X</span>
            </span>
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">
              Analyze once. Transform many.
            </span>
          </div>
          <p className="text-sm text-neutral-400 mt-2 max-w-xl">
            Upload a document to build one canonical understanding, then
            generate audience-specific outputs from it.
          </p>
        </Link>
      </header>

      {error && (
        <div className="rounded-md border border-red-800 bg-red-950 text-red-300 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Upload */}
      <section className="flex flex-col gap-4">
        <SectionHeading step={1} title="Upload a document" />
        <div className="grid sm:grid-cols-2 gap-4">
          <label
            htmlFor="pdf-upload"
            className={`relative border border-dashed border-neutral-700 rounded-lg p-6 flex flex-col items-center justify-center gap-3 text-center transition-colors hover:border-neutral-500 ${
              uploading ? "cursor-not-allowed" : "cursor-pointer"
            }`}
          >
            <p className="text-sm font-medium text-neutral-200">
              {selectedFileName ?? "Upload a file"}
            </p>
            <input
              id="pdf-upload"
              type="file"
              accept="application/pdf"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setSelectedFileName(file.name);
                  handleUploadFile(file);
                }
              }}
              className={`absolute inset-0 w-full h-full opacity-0 ${
                uploading ? "cursor-not-allowed" : "cursor-pointer"
              }`}
            />
          </label>
          <div className="border border-neutral-800 rounded-lg p-4 flex flex-col gap-3 transition-colors hover:border-neutral-700">
            <p className="text-sm font-medium text-neutral-200">
              Or paste raw text
            </p>
            <textarea
              className="w-full h-28 border border-neutral-700 bg-neutral-900 rounded-md p-2 text-sm text-neutral-100 resize-none focus:outline-none focus:border-neutral-500 transition-colors"
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste document text here..."
            />
            <button
              onClick={handleUploadText}
              disabled={uploading || !pastedText.trim()}
              className="self-start rounded-md bg-neutral-100 text-neutral-900 text-sm font-medium px-4 py-2 cursor-pointer shadow-[0_0_20px_-6px_rgba(255,255,255,0.35)] hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {uploading ? "Analyzing..." : "Analyze"}
            </button>
          </div>
        </div>
        {uploading && (
          <p className="text-sm text-neutral-400">
            Extracting text and running semantic analysis...
          </p>
        )}
      </section>

      {/* Document Workspace */}
      {doc && (
        <section className="flex flex-col gap-4">
          <SectionHeading step={2} title="Document understanding" />
          <div className="border border-neutral-800 rounded-lg p-5 flex flex-col gap-4 transition-colors hover:border-neutral-700">
            <div>
              <h3 className="font-semibold text-neutral-50">{doc.title}</h3>
              <p className="text-sm text-neutral-300 mt-1">{doc.summary}</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-neutral-200 mb-1.5">Topics</p>
                <div className="flex flex-wrap gap-1.5">
                  {doc.topics.map((t) => (
                    <Pill key={t}>{t}</Pill>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-medium text-neutral-200 mb-1.5">
                  Entities
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {doc.entities.map((e) => (
                    <Pill key={e}>{e}</Pill>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <p className="font-medium text-neutral-200 mb-1.5 text-sm">
                Key points
              </p>
              <ul className="list-disc list-inside text-sm text-neutral-200 space-y-1">
                {doc.key_points.map((k, i) => (
                  <li key={i}>{k}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* Generate */}
      {doc && (
        <section className="flex flex-col gap-4">
          <SectionHeading step={3} title="Choose your outputs" />
          <div className="border border-neutral-800 rounded-lg p-5 flex flex-col gap-5 transition-colors hover:border-neutral-700">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(Object.keys(OUTPUT_LABELS) as OutputType[]).map((output) => {
                const checked = selectedOutputs.has(output);
                return (
                  <label
                    key={output}
                    className={`flex items-center gap-2 text-sm font-medium rounded-md px-3 py-2 cursor-pointer border transition-colors ${
                      checked
                        ? "border-neutral-100 bg-neutral-100 text-neutral-900"
                        : "border-neutral-700 text-neutral-200 hover:border-neutral-500"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleOutput(output)}
                      className="accent-neutral-100 cursor-pointer"
                    />
                    {OUTPUT_LABELS[output]}
                  </label>
                );
              })}
            </div>

            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              <Field label="Audience">
                <select
                  className="w-full border border-neutral-700 rounded-md px-2 py-1.5 text-neutral-100 bg-neutral-900 cursor-pointer"
                  value={config.audience}
                  onChange={(e) =>
                    setConfig({ ...config, audience: e.target.value as GenerationConfig["audience"] })
                  }
                >
                  <option value="executive">Executive</option>
                  <option value="technical">Technical</option>
                  <option value="general_public">General Public</option>
                  <option value="investor">Investor</option>
                </select>
              </Field>
              <Field label="Tone">
                <select
                  className="w-full border border-neutral-700 rounded-md px-2 py-1.5 text-neutral-100 bg-neutral-900 cursor-pointer"
                  value={config.tone}
                  onChange={(e) => setConfig({ ...config, tone: e.target.value as GenerationConfig["tone"] })}
                >
                  <option value="formal">Formal</option>
                  <option value="conversational">Conversational</option>
                  <option value="urgent">Urgent</option>
                  <option value="neutral">Neutral</option>
                </select>
              </Field>
              <Field label="Detail level">
                <select
                  className="w-full border border-neutral-700 rounded-md px-2 py-1.5 text-neutral-100 bg-neutral-900 cursor-pointer"
                  value={config.detail_level}
                  onChange={(e) =>
                    setConfig({ ...config, detail_level: e.target.value as GenerationConfig["detail_level"] })
                  }
                >
                  <option value="brief">Brief</option>
                  <option value="standard">Standard</option>
                  <option value="detailed">Detailed</option>
                </select>
              </Field>
              <Field label="Objective">
                <select
                  className="w-full border border-neutral-700 rounded-md px-2 py-1.5 text-neutral-100 bg-neutral-900 cursor-pointer"
                  value={config.objective}
                  onChange={(e) =>
                    setConfig({ ...config, objective: e.target.value as GenerationConfig["objective"] })
                  }
                >
                  <option value="inform">Inform</option>
                  <option value="persuade">Persuade</option>
                  <option value="warn">Warn</option>
                  <option value="update_status">Update Status</option>
                </select>
              </Field>
              <Field label="Style">
                <select
                  className="w-full border border-neutral-700 rounded-md px-2 py-1.5 text-neutral-100 bg-neutral-900 cursor-pointer"
                  value={config.style}
                  onChange={(e) => setConfig({ ...config, style: e.target.value as GenerationConfig["style"] })}
                >
                  <option value="narrative">Narrative</option>
                  <option value="bullet_points">Bullet Points</option>
                  <option value="structured">Structured</option>
                </select>
              </Field>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating || selectedOutputs.size === 0}
              className="self-start rounded-md bg-neutral-100 text-neutral-900 text-sm font-medium px-5 py-2.5 cursor-pointer shadow-[0_0_20px_-6px_rgba(255,255,255,0.35)] hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {generating ? "Generating..." : "Generate"}
            </button>
          </div>
        </section>
      )}

      {/* Results */}
      {artifacts.length > 0 && (
        <section className="flex flex-col gap-4">
          <SectionHeading step={4} title="Results" />
          <div className="grid sm:grid-cols-2 gap-4">
            {artifacts.map((artifact) => (
              <ArtifactCard key={artifact.id} artifact={artifact} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SectionHeading({ step, title }: { step: number; title: string }) {
  return (
    <h2 className="text-lg font-semibold text-neutral-50 flex items-center gap-2">
      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-accent text-white text-xs font-semibold shrink-0">
        {step}
      </span>
      {title}
    </h2>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-neutral-900 border border-neutral-700 text-neutral-200 rounded-full px-2.5 py-0.5 text-xs font-medium">
      {children}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function ArtifactCard({ artifact }: { artifact: Artifact }) {
  const preview = summarizeContent(artifact);
  const statusStyle =
    artifact.status === "generated"
      ? "text-neutral-100 bg-neutral-900 border-neutral-700"
      : artifact.status === "flagged"
      ? "text-amber-300 bg-amber-950 border-amber-800"
      : "text-red-300 bg-red-950 border-red-800";

  return (
    <div className="border border-neutral-800 rounded-lg p-4 flex flex-col gap-3 transition-colors hover:border-neutral-700">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-neutral-50">
          {OUTPUT_LABELS[artifact.output_type]}
        </h3>
        <span className={`text-xs font-medium border rounded-full px-2 py-0.5 ${statusStyle}`}>
          {artifact.status}
        </span>
      </div>

      {artifact.status !== "failed" ? (
        <p className="text-sm text-neutral-300 whitespace-pre-line line-clamp-6">
          {preview}
        </p>
      ) : (
        <p className="text-sm text-red-400">
          {artifact.validation_notes.join(" ") || "Generation failed."}
        </p>
      )}

      {artifact.validation_notes.length > 0 && artifact.status === "flagged" && (
        <p className="text-xs text-amber-300">
          Flags: {artifact.validation_notes.join("; ")}
        </p>
      )}

      {artifact.status !== "failed" && artifact.available_formats.length > 0 && (
        <div className="flex gap-2 pt-1">
          {artifact.available_formats.map((fmt) => (
            <a
              key={fmt}
              href={exportUrl(artifact.id, fmt)}
              className="cursor-pointer text-xs font-medium text-neutral-200 border border-neutral-700 rounded-md px-3 py-1.5 hover:bg-neutral-100 hover:text-neutral-900 hover:border-neutral-100"
            >
              Download {FORMAT_LABELS[fmt] || fmt}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function summarizeContent(artifact: Artifact): string {
  const c = artifact.content as Record<string, unknown>;
  switch (artifact.output_type) {
    case "executive_summary":
      return `${c.headline as string}\n\n${c.overview as string}`;
    case "linkedin_post":
      return `${c.hook as string}\n\n${c.body as string}`;
    case "advisory":
      return `${c.title as string} [${c.severity as string}]\n\n${c.summary as string}`;
    case "presentation": {
      const slides = (c.slides as { slide_title: string }[]) || [];
      return `${c.title as string}\n\n${slides.map((s) => `- ${s.slide_title}`).join("\n")}`;
    }
    default:
      return "";
  }
}
