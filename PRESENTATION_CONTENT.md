# Presentation Content

Written content only — paste this into slide software. No formatting or
slide design decisions are made here.

---

## Slide 1: The Problem

**Bullet points:**
- Every organization produces long-form documents — incident reports,
  research findings, policy drafts — that need to reach different
  audiences in different formats.
- Today that means manually rewriting the same content again and again:
  once for the executive summary, once for a social post, once for a
  formal advisory, once for a slide deck.
- Using a generic AI chatbot for this doesn't fix the problem — it just
  moves it. Each output is generated from an independent prompt, so
  facts, numbers, and framing can quietly drift between the four outputs
  because nothing forces them to agree.
- For anything regulatory, executive-facing, or safety-critical (like a
  security advisory), that drift isn't just annoying — it's dangerous.

**Speaker notes:** Open with a concrete scenario: a security team writes
a 5-page incident report, and now needs an executive summary for
leadership, a LinkedIn post for public disclosure, a formal advisory for
affected parties, and a slide deck for the board. Ask the audience: what
happens today? Someone manually rewrites it four times, or someone pastes
it into ChatGPT four separate times and hopes the numbers match.

---

## Slide 2: The Solution — "Analyze Once, Transform Many"

**Bullet points:**
- We build one canonical, structured understanding of the source document
  — a single AI call extracts title, summary, topics, entities, key
  points, and claims.
- Every output — Executive Summary, LinkedIn Post, Advisory, Presentation
  — is generated from that *same* structured understanding, not from
  independent re-prompting of the raw document.
- Because every output reads from one shared, validated source of truth,
  the facts can't drift between outputs — they're all downstream of the
  same understanding.
- The user picks audience, tone, language, detail level, objective, and
  style per output — the content is tailored, the underlying facts are
  not re-derived.

**Speaker notes:** This is the core differentiator versus "just use
ChatGPT." Emphasize the word "canonical" — one document, one understanding,
many transformations. Use the incident report scenario from Slide 1: the
CVE number, the employee count, the containment time — those facts are
extracted once and are identical across all four generated outputs.

---

## Slide 3: How It Works (Architecture)

**Bullet points:**
- **Ingest:** PDF or pasted text → extracted into a `CanonicalDocument`
  (raw text + naive section split).
- **Analyze once:** One structured AI call turns the canonical document
  into `DocumentSemantics` — title, summary, topics, entities, key
  points, claims.
- **Build a brief:** Semantics + the user's chosen audience/tone/style
  become a `ContentBrief` — the single input every output generator sees.
- **Transform many:** A registry of transformers (Executive Summary,
  LinkedIn Post, Advisory, Presentation) each make one structured AI call
  against the same brief, returning strictly typed content.
- **Validate, then render:** Deterministic checks catch empty or
  malformed content; deterministic code (not the AI) turns each typed
  result into a real PDF, PPTX, or TXT file.

**Speaker notes:** Walk through the pipeline diagram left to right. Stress
two design choices: (1) the AI is only ever asked for structured JSON
against a fixed schema, never for a final file — rendering is
deterministic code, so a PDF or PPTX layout is never "hallucinated"; (2)
validation is a deterministic safety net, not another AI call, which
keeps this fast and predictable in a live demo.

---

## Slide 4: Tech Stack & What's Novel

**Bullet points:**
- **Backend:** Python, FastAPI, Pydantic v2 — every stage of the pipeline
  (`CanonicalDocument`, `ContentBrief`, `OutputArtifact`) is a real typed
  model, not a loose dictionary of prompt strings.
- **AI:** Google Gemini, called with structured output (`response_schema`)
  so every AI response is guaranteed to match a Pydantic schema — no
  regex-parsing of free text, no brittle prompt-engineering for format.
- **Storage:** SQLite + local filesystem — intentionally minimal, no
  hosted database, because a 24-hour MVP demo doesn't need one.
- **Export:** reportlab (PDF) and python-pptx (PPTX) generate real,
  openable files deterministically from typed content — the AI never
  produces file structure directly.
- **What's novel:** the separation between *understanding* (analyzed once,
  validated, reused) and *transformation* (many outputs, one shared
  source of truth) — this is the architectural difference between a
  content platform and a chatbot wrapper.

**Speaker notes:** If asked "why not just LangChain / an agent
framework," the answer is: this problem doesn't need agents or retrieval
— it needs one clean intermediate representation and a small, explicit
registry of transformers. Simpler, faster, and easier to reason about
than an agentic pipeline for a fixed set of four output types.

---

## Slide 5: Demo & Impact

**Bullet points:**
- **Live demo:** Upload a 3-page fictional cybersecurity incident report
  → one Analyze call extracts the CVE, timeline, and impact → generate
  Executive Summary, LinkedIn Post, Advisory, and Presentation in a
  single click → download each as a real PDF/PPTX/TXT file.
- **Impact:** Turns hours of manual rewriting into minutes, with a
  built-in guarantee that every audience-facing version of a document
  agrees on the underlying facts.
- **Where this generalizes:** any domain producing long-form reports that
  need multiple audience-specific derivatives — security teams, policy
  and compliance teams, research and analyst teams, corporate
  communications.
- **What's next (post-hackathon):** DOCX export, additional output types
  (infographic/video package — already schema-stubbed), multi-document
  comparison, and organization-specific tone/style presets.

**Speaker notes:** Close on the demo — this is best shown live, not
described. If time is short, show the Document Workspace (structured
understanding) and one generated artifact download (e.g. the PDF
Advisory) as proof that this produces real, usable output, not just chat
text.
