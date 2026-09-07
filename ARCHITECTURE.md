# Architecture

## The core idea: Analyze Once, Transform Many

A raw ChatGPT wrapper re-prompts the model independently for every output,
so an Executive Summary and a LinkedIn Post about the same document can
silently disagree on facts, dates, or numbers — each generation is its own
roll of the dice against the source text. This platform instead builds
**one validated, structured understanding of the document a single time**,
and every downstream output is generated from that same structure. Facts
can't drift between outputs because every output reads from the same
`DocumentSemantics` object — no output re-derives understanding from raw
text.

## Pipeline

```
Upload (PDF or pasted text)
  │
  ▼
Ingestion (pypdf text extraction + naive heading-based section split)
  │
  ▼
CanonicalDocument   (id, source, raw_text, sections, semantics, status)
  │
  ▼
Semantic Analysis  — ONE Gemini structured-output call
  │   → DocumentSemantics: title, summary, topics, entities,
  │     key_points, claims
  ▼
ContentBrief  (DocumentSemantics + user's GenerationConfig:
  │            audience / tone / language / detail_level / objective / style)
  ▼
Transformation Engine — registry of Transformers, one Gemini
  │   structured-output call each, all reading the SAME ContentBrief:
  │     • ExecutiveSummaryTransformer → ExecutiveSummaryContent
  │     • LinkedInTransformer         → LinkedInPostContent
  │     • AdvisoryTransformer         → AdvisoryContent
  │     • PresentationTransformer     → PresentationContent
  ▼
Validation — deterministic checks only (required fields present,
  │            non-empty, minimum length, valid enum values).
  │            No re-prompting; artifacts that fail are flagged, not blocked.
  ▼
Rendering — deterministic code turns each typed artifact into a file.
  │           The model is NEVER asked to produce PDF/PPTX structure —
  │           only structured JSON matching a Pydantic schema.
  │             • reportlab   → PDF (Executive Summary, Advisory)
  │             • python-pptx → PPTX (Presentation)
  │             • plain write → TXT (all types)
  ▼
Export files served to the frontend for preview + download
```

## Why real Pydantic models, not just prompts

Four types anchor the pipeline, and each is a real Pydantic model, not a
string template:

- **`CanonicalDocument`** (`backend/app/schemas/document.py`) — the
  single source of truth for a document: raw text, naive sections, and
  (once analysis runs) its `DocumentSemantics`. Built once at ingestion
  time; never rebuilt per output.
- **`ContentBrief`** (`backend/app/schemas/brief.py`) — combines the
  document's semantics with the user's chosen `GenerationConfig`
  (audience, tone, language, detail level, objective, style). This is the
  *only* input every transformer receives — no transformer touches
  `raw_text` directly, so there's no way for one output to "see" facts
  another output didn't.
- **`Transformer`** (`backend/app/transformation/base.py`) — a small
  protocol (`build_prompt(brief) -> str`, `generate(brief) -> BaseModel`)
  implemented once per output type and registered in a plain dict
  (`TRANSFORMER_REGISTRY`). Adding a fifth output type means writing one
  new file with a prompt template and a Pydantic response schema — nothing
  else in the pipeline changes.
- **`OutputArtifact`** (`backend/app/schemas/artifacts.py`) — the
  generated, validated content plus status (`generated` / `flagged` /
  `failed`) and validation notes, persisted to SQLite and handed to the
  renderers.

Every Gemini call in this system (`analyzer.py`, and every transformer via
`BaseTransformer.generate`) uses the SDK's `response_schema` parameter
against one of these Pydantic models — the model is constrained to return
valid JSON matching the schema, not free text that gets regex-parsed.

## Storage

SQLite (`backend/app.db`) holds two tables — `documents` and `artifacts` —
storing the serialized Pydantic models as JSON columns alongside a few
indexed fields (id, status, timestamps). Uploaded files and rendered
exports live under `backend/storage/{uploads,artifacts}/` on the local
filesystem. There is no queue: generation is synchronous, since a
demo-sized document and four outputs complete well within an HTTP request
timeout, and synchronous flow is far easier to debug in a 24-hour build.

## Frontend

A single Next.js page (`frontend/src/app/page.tsx`) walks through four
sections — Upload, Document Workspace, Generate, Results — with plain
`fetch` calls to the FastAPI backend (`frontend/src/lib/api.ts`). No
routing, no server actions, no auth: state lives in React `useState`.
