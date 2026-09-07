# WORKFLOW.md — Project Bible

This is the single source of truth for the state of this project: what's
built, what's decided, what's left, and why things are the way they are.
**Update this file after every meaningful change** — new feature, config
change, bug fix, decision reversal. If it's not here, treat it as not
decided.

Other docs exist for other audiences: `README.md` (how to run it),
`ARCHITECTURE.md` (why the pipeline is shaped this way, for judges),
`PRESENTATION_CONTENT.md` (slide content to paste into a deck). This file
is for the team, to stay in sync during the build.

---

## Problem Statement (SIH)

Build a GenAI platform that ingests a source document and produces
multiple audience-specific outputs from it — without each output being an
independent, potentially-inconsistent re-prompt of the raw document. The
differentiator vs. a raw ChatGPT wrapper: one validated, structured
"understanding" of the document, reused by every output.

## Non-negotiable scope boundaries

Do not add, even if it seems like best practice:

- Auth / user accounts
- Hosted DB (Supabase/Postgres) — SQLite + local filesystem only
- RAG / "ask the document" / vector DB
- Observability tooling (Langfuse etc.)
- Docker — only if time remains at the very end
- DOCX/image/video ingestion — PDF and pasted text only
- Agents / LangChain — plain Gemini calls with Pydantic structured output

---

## Project name

**ARTEFAX** — wordmark + tagline ("Analyze once. Transform many.") shown
in the header on both the landing page (`frontend/src/app/page.tsx`, `/`)
and the tool (`frontend/src/app/app/page.tsx`, `/app`), and set as the
browser tab title (`frontend/src/app/layout.tsx`).

## Current Status (as of 2026-09-07)

**End-to-end pipeline is fully working and verified**, both via direct API
calls and a real headless-browser click-through (upload → analyze →
generate all 4 outputs → download PDF/PPTX/TXT), with zero console errors
and zero failed/flagged artifacts on the demo document.

| Piece | Status |
|---|---|
| Backend scaffold (FastAPI, Pydantic v2, SQLite) | ✅ Done |
| PDF + pasted-text ingestion → `CanonicalDocument` | ✅ Done, tested on real PDF |
| Semantic analysis (1 Gemini call → `DocumentSemantics`) | ✅ Done |
| `ContentBrief` assembly | ✅ Done |
| 4 transformers (Exec Summary, LinkedIn, Advisory, Presentation) | ✅ Done, all passing |
| Deterministic validation checks | ✅ Done |
| Rendering (PDF/PPTX/TXT via reportlab/python-pptx) | ✅ Done, all formats verified openable |
| API endpoints (documents/generate/artifacts/export) | ✅ Done |
| Frontend tool (Upload/Workspace/Generate/Results, now at `/app`) | ✅ Done, browser-tested |
| Retry/backoff on Gemini 429/503 | ✅ Done |
| Demo PDF (`samples/exemplecorp_incident_report.pdf`) | ✅ Done, 3 pages |
| README / ARCHITECTURE / PRESENTATION_CONTENT | ✅ Done |
| ARTEFAX branding, UI contrast/polish pass | ✅ Done, verified in light + dark OS theme |
| Landing page (`/`) with CTA into `/app` | ✅ Done, browser-tested |
| Dark theme — permanent, no toggle, no light path | ✅ Done (toggle was added then explicitly removed same day — see decision log) |
| Cursor affordance on all clickable buttons/links | ✅ Done, verified via computed `cursor` style |
| Second sample document | ❌ Not started (stretch) |
| DOCX export | ❌ Not started (stretch) |
| Docker | ❌ Not started (stretch, only if time remains) |

---

## Key Decisions Log

Newest first. Each entry: what was decided, why, and what it touched.

### 2026-09-07 — Render build failure: pinned Python version
- **Trigger:** First real Render deploy attempt failed at the backend
  build step. Log showed Render defaulting to **Python 3.14.3**, then
  `pip install -r requirements.txt` failing on `pydantic-core==2.27.2`:
  no prebuilt wheel for 3.14 yet, so pip fell back to compiling it from
  source via Rust/maturin, which then failed because Render's build
  filesystem is read-only for the cargo registry cache
  (`Read-only file system (os error 30)`). **This is the same class of
  bug as the very first local setup issue in this project** (see the
  2026-09-07 "Python venv architecture issues" entry near the bottom of
  this log) — different platform, same root cause: a Python version too
  new for `pydantic-core` to have a prebuilt wheel yet.
- **Confirmed the exact fix mechanism from Render's own docs before
  guessing** (fetched `render.com/docs/troubleshooting-deploys`, which
  pointed to `render.com/docs/language-support`): Render supports
  pinning via a `PYTHON_VERSION` env var **or** a `.python-version`
  file. Did both, redundantly:
  - Added `PYTHON_VERSION: 3.12.7` to the backend service's `envVars` in
    `render.yaml` (centralizes it with the rest of the Blueprint config).
  - Added `backend/.python-version` containing `3.12.7` as a second
    signal (also incidentally helps anyone using `pyenv` locally, though
    this project's local venv setup doesn't depend on it).
  - `3.12.7` chosen specifically because `pydantic-core==2.27.2` has a
    prebuilt wheel for it (unlike 3.14) — matches the same reasoning
    that led to using Python 3.13 for the local macOS venv originally.
- **Also flagged to the user, unrelated to this fix but noticed in the
  same turn:** their real `GEMINI_API_KEY` value appeared in the
  conversation transcript via an IDE file-selection of `backend/.env`.
  The file itself was never committed (`.env` is gitignored, only
  `.env.example` is tracked), but the raw key was now sitting in chat
  history — recommended rotating it in AI Studio as a precaution.
- **Files touched:** `render.yaml` (`PYTHON_VERSION` env var),
  `backend/.python-version` (new), `README.md` (new note in the
  "Deploying to Render" section explaining the fix, cross-referenced to
  the existing Apple Silicon note since they're the same class of bug).
- **Not yet re-verified against an actual Render deploy** — this fix is
  based on Render's documented mechanism and the same root-cause
  reasoning that resolved the local equivalent, but the next Render
  build attempt should be watched to confirm it actually clears this
  step (and doesn't surface a similar issue with the frontend's Node
  build, which hasn't been exercised on Render yet either).

### 2026-09-07 — Render deployment: Blueprint (render.yaml) for both services
- **Trigger:** User wants both services deployable from one repo via a
  single Render Blueprint, with CORS/env-var wiring handled automatically
  rather than hardcoded after the fact — deployment config only, no
  application logic changes beyond what's needed for CORS/URL wiring.
- **`render.yaml`** at the project root defines two `type: web` services:
  `artefax-backend` (`env: python`, `rootDir: backend`, `pip install -r
  requirements.txt`, `uvicorn app.main:app --host 0.0.0.0 --port $PORT`,
  `healthCheckPath: /api/health`) and `artefax-frontend` (`env: node`,
  `rootDir: frontend`, `npm install && npm run build`, `npm run start`).
  Both on `plan: free`.
- **Cross-service URL wiring via `fromService`**, as asked, with a
  caveat handled in code rather than YAML: Render's Blueprint
  `fromService.property` only exposes `host` (a bare hostname like
  `artefax-backend.onrender.com`), not a full scheme-prefixed URL — YAML
  can't string-concatenate a `https://` prefix onto that. Rather than
  fall back to a manual post-deploy step, normalized this in application
  code instead: `backend/app/main.py`'s CORS setup and
  `frontend/src/lib/api.ts`'s `API_URL` both now prepend `https://` to
  whatever they receive if it doesn't already contain `://`. This means
  the Blueprint's automatic wiring actually produces a working
  connection end-to-end, not just a hostname that needs manual fixing.
  Verified directly: started the backend with `FRONTEND_URL=artefax-
  frontend.onrender.com` (bare host, simulating what `fromService` would
  inject) and confirmed a real CORS preflight from that origin got back
  `access-control-allow-origin: https://artefax-frontend.onrender.com`.
- **`GEMINI_API_KEY` marked `sync: false`** in the Blueprint — Render's
  way of saying "this env var exists but must be set manually in the
  dashboard," so the real key is never committed. `MODEL_NAME` ships
  with its existing default as a plain `value`.
- **Flagged the ephemeral-filesystem issue clearly, as asked, rather
  than letting it be a surprise:** the backend's SQLite DB and
  `storage/uploads` + `storage/artifacts` all live on local disk
  (`backend/app/config.py`'s `BASE_DIR`-relative paths, unchanged) —
  fine for local dev, but Render's free/standard web services have an
  ephemeral filesystem, so **every deploy or restart wipes all of it**.
  Persisting this for real would need a paid Render persistent disk or a
  hosted DB/object storage — explicitly out of scope here, documented
  instead of silently worked around. Also flagged free-tier cold-start
  sleep behavior for demo planning.
- **`.env.example` files updated** on both sides to list every var
  Render needs: backend gets `FRONTEND_URL` (optional, deploy-only)
  added alongside the existing `GEMINI_API_KEY`/`MODEL_NAME`; frontend
  gets a new `.env.local.example` (didn't exist before — only the
  gitignored `.env.local` did). Had to special-case
  `frontend/.gitignore`'s blanket `.env*` pattern with
  `!.env.local.example` so the example file itself isn't swallowed by
  the same rule that (correctly) keeps the real `.env.local` out of git.
- **Verified no regressions**: backend still serves `/api/health` and
  completes a full analyze call with the new CORS logic in place;
  frontend still type-checks/lints clean and a real browser-driven
  upload → analyze flow against `NEXT_PUBLIC_API_URL=http://localhost:
  8000` (unaffected by the new normalization logic, since it already has
  `://`) completed with zero console errors.
- **Files touched:** `render.yaml` (new, project root),
  `backend/app/config.py` (`FRONTEND_URL`), `backend/app/main.py` (CORS
  origin list), `backend/.env.example`, `frontend/src/lib/api.ts`
  (`API_URL` normalization), `frontend/.env.local.example` (new),
  `frontend/.gitignore` (one-line exception), `README.md` (new
  "Deploying to Render" section covering the Blueprint, the
  `fromService` wiring, and both the persistence and cold-start
  caveats).

### 2026-09-07 — Accent color: option C picked, one revert, two extensions
- **User picked option C** (`#3454D1`, the deeper/muted navy-blue) by
  editing `globals.css` directly — left as-is, just corrected the stale
  "currently testing option A" comment to say C.
- **Reverted the diagram accent line** — the AI→Understanding connector
  in `ArtefaxFlowDiagram` (added in the previous accent-test task) read
  as "randomly blue" rather than intentional once seen live. Reverted
  that `<line>` to `stroke="currentColor"` / `markerEnd="url(#artefax-
  arrow)"` and deleted the now-unused `artefax-arrow-accent` marker
  entirely (dead code, not left commented out). Both diagrams are back
  to fully neutral.
- **Extended accent to two more spots, explicitly requested this
  round** (expands past the original "4 items only" scope from the
  prior accent task — this is a new, explicit ask, not scope creep):
  1. The "X" in the **ARTEFAX** wordmark, on both the landing nav
     (`frontend/src/app/page.tsx`) and the `/app` dashboard header
     (`frontend/src/app/app/page.tsx`) — split the string
     `"ARTEFA" + <span className="text-accent">X</span>` in both
     places; the rest of the wordmark stays `text-neutral-50`.
  2. The numbered step badges (1/2/3/4) on the `/app` dashboard's
     section headings (Upload a document / Document understanding /
     Choose your outputs / Results) — `SectionHeading`'s badge
     `bg-neutral-100 text-neutral-900` → `bg-accent text-white`. This
     is the dashboard's equivalent of the landing page's "How it
     works" step badges, which were already accent-colored.
- **Verified:** computed color on the "X" span matches the resolved
  option-C RGB (`rgb(52, 84, 209)`) on both pages, while the rest of
  "ARTEFA" stays near-white; the Artefax diagram now has **zero**
  accent-stroked lines; the `/app` dashboard's step-1 badge (the only
  one mounted on a fresh page load — steps 2–4 are conditionally
  rendered once a document/artifacts exist, but share the same
  `SectionHeading` component so the fix applies to all of them) reports
  the accent background. Zero console errors.
- **Files touched:** `frontend/src/app/globals.css` (comment only),
  `frontend/src/app/page.tsx`, `frontend/src/app/app/page.tsx`,
  `frontend/src/components/FlowDiagrams.tsx`. `backend/` untouched.

### 2026-09-07 — First accent color test (single CSS variable, 4 elements)
- **Trigger:** User wants to trial one accent color against the
  black/white/grey design, scoped to exactly 4 element types, swappable
  from one place while comparing shades — explicitly a reversible test,
  not a commitment to a final color.
- **`--accent` CSS variable** added to `:root` in `globals.css`, default
  `#4A6CF7` ("option A"), with two alternates documented in a comment
  directly above it (`#5B7FFF` cooler/lighter, `#3454D1` deeper/muted) —
  swap the one line to compare. Also registered as `--color-accent` in
  the `@theme inline` block, which makes Tailwind v4 auto-generate
  `bg-accent` / `border-accent` / `text-accent` utility classes from the
  variable — used those instead of `bg-[var(--accent)]` arbitrary values
  for readability, but they resolve to the exact same CSS variable, so
  the "change one line" property holds either way.
- **Applied to exactly 4 things, nothing else:**
  1. All three "Launch App" links (nav, hero, CTA footer) —
     `bg-neutral-100 text-neutral-900` → `bg-accent text-white`; hover
     changed from `hover:bg-white` (which would have reverted straight
     back to white, defeating the point) to `hover:brightness-110` so
     hovering stays in the accent's color family.
  2. The 4 step-number circles in "How it works" — `bg-neutral-100
     text-neutral-900` → `bg-accent text-white`. The large ghost
     numerals behind them were explicitly left alone (still faint white
     stroke) — they're a separate element from the small circle badge.
  3. "See how it works" — border stays neutral at rest, only
     `hover:border-neutral-500` → `hover:border-accent`.
  4. In `ArtefaxFlowDiagram` (`FlowDiagrams.tsx`), only the AI→
     Understanding line — added a second, accent-only marker
     (`artefax-arrow-accent`, `fill="var(--accent)"`) so both the line
     stroke and its arrowhead go accent-colored together, since a shared
     `currentColor` marker used by every other line in both diagrams
     couldn't be recolored for just one connector without affecting the
     rest. Every other line in both the naive and Artefax diagrams (the
     PDF→AI arrow, the branch spine, all 4 output ticks) stays neutral
     `currentColor`.
- **Verified the scope precisely, not just that the color exists**: a
  page-wide DOM scan for any element whose computed `color`/
  `backgroundColor`/`borderColor` equals `rgb(74, 108, 247)` (the
  resolved `#4A6CF7`) at rest returned **exactly 7** matches — the 3
  Launch App buttons + 4 step badges, nothing more. Confirmed the
  Artefax diagram has **exactly 1** accent-stroked `<line>` (the one
  with `x1=98, x2=130`, i.e. AI→Understanding) and the naive diagram has
  **0**. Confirmed "See how it works" border is neutral before hover and
  becomes accent only after a real `.hover()` interaction. Confirmed the
  ghost numerals' stroke color is untouched. Zero console errors.
- **Files touched:** `frontend/src/app/globals.css` (new `--accent`
  variable), `frontend/src/app/page.tsx` (2 of the 3 Launch App links),
  `frontend/src/components/Hero.tsx` (3rd Launch App link + "See how it
  works" hover), `frontend/src/components/HowItWorksSection.tsx` (step
  badges), `frontend/src/components/FlowDiagrams.tsx` (one diagram
  connector). `backend/` untouched, as instructed.
- **To compare shades:** edit the single `--accent:` line in
  `frontend/src/app/globals.css` — no other file needs to change.

### 2026-09-07 — Ghost numeral fix: opacity, position, font weight
- **Trigger:** User reported the ghost `01`/`02`/`03`/`04` behind "How it
  works" were too visible and overlapping the paragraph text below each
  step (not just the badge/title), and that they read as a different
  (serif/slab) font than the monospace badge digits.
- **Font was already correct — checked before assuming a bug:** computed
  `fontFamily` on the ghost span was confirmed as `"Geist Mono", "Geist
  Mono Fallback"`, identical to the badge. The "serif" look was Geist
  Mono's slab-serif numeral terminals becoming much more visible at
  `font-bold` + 140px — invisible at the badge's `text-xs`. Fixed by
  dropping the ghost numeral to `font-normal` (400) rather than bold, at
  a smaller `100px` (down from `140px`), which reads as materially closer
  to the badge's numeral shape while staying a single-font system.
- **Overlap fixed by measuring, not guessing:** repositioned from
  `-top-8 -left-2` to `-top-10 -left-1` and shrank the size; verified via
  `getBoundingClientRect()` that the ghost numeral's bottom edge (477.5px)
  now sits 4px *above* the paragraph's top edge (481.5px) — no overlap,
  confirmed on the live page, not just "should be fine" from the CSS.
- **Opacity halved as asked:** stroke color `rgba(255,255,255,0.06)` →
  `rgba(255,255,255,0.03)`.
- **Files touched:** `frontend/src/components/HowItWorksSection.tsx`
  only.

### 2026-09-07 — Visual depth pass, Part B ("How it works" scroll-reveal)
- **Trigger:** Second half of the same visual-depth request — replace
  the static 4-column "How it works" layout with a scroll-triggered,
  staggered reveal, explicitly told to reuse the `ComparisonSection`
  reveal pattern rather than invent a new one, and to hold off on
  starting until Part A was pushed (user pushed Part A themselves,
  then gave the go-ahead for Part B).
- **New `frontend/src/components/HowItWorksSection.tsx`:** extracted
  from the inline section in `page.tsx` (same reason as
  `ComparisonSection` — `IntersectionObserver` is client-only). Single
  observer on the section (not one per step), disconnected after the
  first intersection so it never replays on scroll-back-and-forth.
  Each of the 4 steps gets `opacity: 0` + `translateY(20px)` →
  `opacity: 1` + `translateY(0)` on `transition-all duration-500
  ease-out`, with an incremental `transitionDelay` of `i * 130ms` (0,
  130, 260, 390ms) so they cascade left-to-right rather than popping in
  together — chose `translateY` + inline per-index delay over
  `ComparisonSection`'s `delay-150` Tailwind class because 4 steps need
  4 distinct offsets, not just 2 (a fixed set of Tailwind `delay-*`
  utilities would work but inline `transitionDelay: ${i*130}ms` scales
  to any step count without picking new class names each time).
  The STEPS data array, and the ghost-numeral + monospace step-number
  styling from Part A, moved into this component unchanged — they were
  living inline in `page.tsx` and are now co-located with the section
  that uses them.
- **Verified the actual staggered cascade, not just the end state:**
  sampled opacity at ~150ms mid-transition and confirmed step 1 was
  partway through (`~0.55`) while steps 2–4 were still at `0` (their
  delays hadn't elapsed yet) — proof the stagger is real, not just four
  elements animating in sync. Confirmed `0` before scroll, `1` on all
  four after settling (~900ms), and still `1` after scrolling away and
  back (no replay). Ghost numerals `01`–`04` still render correctly
  post-refactor. Zero console errors.
- **Files touched:** `frontend/src/components/HowItWorksSection.tsx`
  (new), `frontend/src/app/page.tsx` (removed the inline `STEPS` array
  and static section, now renders `<HowItWorksSection />`). `backend/`
  and the `/app` dashboard untouched, as instructed.

### 2026-09-07 — Visual depth pass, Part A (five polish items)
- **Trigger:** User asked for five landing-page-only polish items,
  explicitly dependency-free (no GSAP/Framer Motion — plain CSS +
  `IntersectionObserver` only), to be built and verified before a
  planned Part B. **Note: the user later said to skip the git
  init/push step entirely ("leave the git push i will do it myself
  then") — no git repo was created and nothing was pushed.**
- **A1 (noise texture) + A2 (page-wide cursor grid):** New
  `frontend/src/components/PageEffects.tsx` (client component)
  wrapping the entire landing page content. Renders two fixed,
  `pointer-events-none` layers: a static tiling film-grain texture
  (inlined `feTurbulence` SVG data URI, ~4% opacity, no image asset)
  and a page-wide version of the cursor-spotlight grid device
  (fainter than the hero's original — reads as one consistent system
  rather than a one-off hero flourish). Since this overlay is `fixed`
  (viewport-anchored), its mask position is driven by raw
  `clientX`/`clientY`, not a scrolling ancestor's bounding rect (that
  distinction matters — an earlier draft of this reveal in `Hero.tsx`
  used rect-relative coordinates because *that* overlay was
  `absolute` inside a scrolling section, not `fixed`).
  - **User caught a real overlap bug immediately after this landed:**
    the hero still had its own local cursor-grid overlay from the
    earlier task, so hovering in the hero showed two overlapping grid
    layers. Fix: stripped the local effect out of `Hero.tsx` entirely
    — it's back to a plain server component (no `"use client"`, no
    `useState`/mousemove handlers) — leaving exactly one grid instance
    site-wide, owned by `PageEffects`.
- **A3 (real containers):** Hero's text block and both
  `ComparisonSection` columns now sit in a bordered card
  (`border border-neutral-800` / `border-white/10`, `rounded-lg`,
  `bg-white/[0.02]`) — same visual language as the existing output
  cards. No dedicated `<Card>` component existed to reuse (the output
  cards use inline Tailwind classes, not a shared component), so this
  matches that pattern rather than inventing a new abstraction; the
  output cards themselves were left untouched (out of scope for this
  request).
- **A4 (typographic system for labels):** No new font needed — Geist
  Mono was already loaded via `next/font` for `--font-geist-mono` and
  wired to Tailwind's `font-mono` utility in `globals.css`, just
  unused until now. Applied `font-mono tracking-wider` to: the hero
  eyebrow, the format-tag pills (PDF/TXT/PPTX), and the "How it
  works" step numbers (now zero-padded — `01`/`02`/`03`/`04` — instead
  of bare `1`/`2`/`3`/`4`). Headings and body copy stay on the sans
  stack, untouched.
- **A5 (ghost numerals):** Each "How it works" step now has a large
  (140px), transparent-fill, thin-stroke (`-webkit-text-stroke: 1px
  rgba(255,255,255,0.06)`) zero-padded numeral positioned absolutely
  behind its small badge/title/description, `pointer-events-none` and
  `hidden` below the `sm` breakpoint per the spec's overflow/cramped-
  screen caveat.
- **Verified via computed-style checks** (screenshots were unavailable
  for this task — mid-session, the transcript hit its image-attachment
  limit from the volume of prior screenshot-based verification passes,
  so this and later checks in the same task run on
  `getComputedStyle`/DOM assertions instead): noise overlay is
  `position: fixed`, `opacity: 0.04`, `pointer-events: none`; page grid
  overlay's mask references `var(--page-x)`; confirmed **zero** elements
  reference the old `var(--x)` hero-local mask (overlap fix held);
  grid opacity goes `0` → `1` on hover both near the top of the page
  and after scrolling to the bottom (proving it's genuinely page-wide,
  not hero-scoped); hero card and comparison columns both report
  `border-style: solid`, `1px`; format tags and eyebrow both resolve
  to `"Geist Mono"` in `getComputedStyle().fontFamily`; all four ghost
  numerals report `color: rgba(0,0,0,0)`, `1px` stroke, `140px` font
  size, correct `01`–`04` text. Zero console errors throughout.
- **Files touched:** `frontend/src/components/PageEffects.tsx` (new),
  `frontend/src/components/Hero.tsx` (local grid effect removed, card
  wrapper + mono eyebrow added), `frontend/src/components/
  ComparisonSection.tsx` (card wrapper added to both columns),
  `frontend/src/app/page.tsx` (wrapped in `<PageEffects>`, mono +
  zero-padding on format tags and step numbers, ghost numerals added).
  `backend/` and the `/app` dashboard screens untouched, as instructed.

### 2026-09-07 — Comparison section: scroll-reveal animation + inline SVG diagrams
- **Trigger:** User asked to polish the "Why not just ask a chatbot four
  times?" / "One structured understanding, reused everywhere" two-column
  section specifically — scroll-triggered reveal, plus a small labeled
  SVG diagram per column illustrating the point.
- **Scroll-reveal:** Extracted the section into a new client component,
  `frontend/src/components/ComparisonSection.tsx`, since the effect
  needs `IntersectionObserver` (client-only). Both columns start at
  `opacity-0 translate-y-[15px]` and animate to resting state
  (`transition-all duration-500 ease-out`) once the section enters the
  viewport; the right column carries an extra `delay-150` so it reads a
  beat after the left ("problem, then solution"). The observer calls
  `disconnect()` on first intersection so it never re-fires — scrolling
  away and back does not re-animate. Verified with a short-viewport
  browser test: opacity is `0` before the section is scrolled into view,
  partially transitioned (~0.38 left / `0` right) at the 100ms mark
  confirming the stagger, and settled at `1`/`1` after ~700ms; a second
  scroll-away-and-back left it at `1` (no re-trigger).
- **Inline SVG diagrams:** Added `frontend/src/components/FlowDiagrams.tsx`
  — `NaiveFlowDiagram` (four separate, non-touching PDF→AI→Output rows,
  under the left column) and `ArtefaxFlowDiagram` (one PDF→AI→
  "Understanding" trunk branching via a spine into the four outputs,
  under the right column). Hardcoded coordinates, thin `currentColor`
  strokes at low opacity (`text-neutral-600`), no fill, no library —
  matches the existing dot-grid aesthetic. Both diagrams live inside
  their column's animated wrapper, so they fade/slide in with the text,
  not on a separate trigger.
- **Caught and fixed a real overlap bug**, not a false alarm this time:
  the first version of `ArtefaxFlowDiagram` had the "Understanding" box
  starting at x=95 while the incoming arrow from the AI box was drawn to
  x=132 — the box start was *before* the arrow's endpoint, so the arrow
  line and the branch spine both cut straight through the box interior
  instead of stopping at its edge (visible in a user-supplied screenshot
  as the arrow slicing through the "Understanding" text). Fixed by
  reworking the coordinate chain so each element starts exactly where the
  previous arrow ends: PDF `[0,34]` → AI `[70,98]` → Understanding
  `[132,202]`, with the branch spine at x=202 (Understanding's right
  edge) and output boxes starting at x=222. Re-verified with a fresh
  screenshot — arrow terminates cleanly at the box edge, spine connects
  to all four outputs with no overlapping lines or text.
- **Also fixed in passing:** an em dash in `Hero.tsx`'s hero paragraph
  ("understanding of it — then generates") had been silently stripped to
  a plain space at some point after it was written, by something outside
  this session's edits (auto-format-on-save is the likely culprit, not
  confirmed). Restored it. Worth watching for — if this recurs elsewhere,
  it's an environment issue, not a content decision.
- **Files touched:** `frontend/src/components/ComparisonSection.tsx`
  (new), `frontend/src/components/FlowDiagrams.tsx` (new),
  `frontend/src/app/page.tsx` (now renders `<ComparisonSection />` in
  place of the old inline section), `frontend/src/components/Hero.tsx`
  (em dash restore only). `backend/` untouched, as instructed.

### 2026-09-07 — Three scoped UI fixes: cursor-following hero grid, navbar size, upload box
- **Trigger:** User asked for three specific, scoped visual fixes —
  explicitly "don't touch backend, don't improve anything not listed."
- **1. Cursor-following grid reveal (hero section):** The static
  top-left-only grid (a fixed CSS mask) is now a full-section grid that's
  invisible by default and reveals in a soft circular area following the
  mouse — a flashlight effect. Extracted the hero `<section>` into a new
  client component, `frontend/src/components/Hero.tsx` (`"use client"`),
  because the mousemove handler needs to live on an ancestor of both the
  background grid layer and the foreground buttons/text — putting it on
  the section itself means the effect keeps tracking correctly even while
  the cursor is over the "Launch App" button (native event bubbling still
  reaches the ancestor listener; pointer-events on the grid layer itself
  stay `none` throughout, so it never blocks clicks). Position is written
  straight to CSS custom properties (`--x`/`--y`) via `ref`/`currentTarget
  .style.setProperty` on every mousemove — deliberately not React state,
  so moving the mouse doesn't trigger a re-render per pixel; only
  mouseenter/mouseleave touch React state, to fade the whole layer's
  opacity in/out. The reveal itself is a `mask-image: radial-gradient(
  circle <radius> at var(--x) var(--y), ...)`. Tuned twice per live
  feedback: first pass (260px radius, 0.06 line opacity) was "too subtle,
  not even noticeable" → bumped to 420px radius, 0.18 line opacity, then
  user asked to keep the larger 420px radius but dial the line opacity
  back down to 0.10 as a middle ground. `page.tsx` now imports and
  renders `<Hero />` in place of the old inline hero JSX.
- **2. Navbar wordmark size:** Landing page nav `text-lg` → `text-xl`
  (18px → 20px, ~11% larger) on the "ARTEFAX" span only. Weight/tracking
  unchanged. (Scoped to the landing page's nav header specifically — the
  `/app` tool page's larger `text-2xl` page-header wordmark was left
  alone since it wasn't the "top navbar" referred to and wasn't asked
  for.)
- **3. Upload box full-area click:** The upload box was a `<div>` with a
  two-line label ("Upload a PDF" + the native input's own "Choose File /
  No file chosen" row) where only the native input row was actually
  clickable/hoverable. Converted the container from `<div>` to
  `<label htmlFor="pdf-upload">` covering the full box (same border/size/
  padding classes, unchanged), with the native `<input id="pdf-upload"
  type="file">` made an absolutely-positioned, fully-covering, opacity-0
  overlay inside it — clicking or hovering anywhere in the box now hits
  the input. Text collapsed to one line, now driven by a new
  `selectedFileName` state (`useState<string | null>`) that starts as
  "Upload a file" and switches to the picked file's name in the same
  `onChange` that kicks off `handleUploadFile`. Verified via
  `page.setInputFiles` that the label text updates to the filename and
  the full analyze pipeline still completes with zero console errors —
  the visual-only refactor didn't break the actual upload behavior.
- **Files touched:** `frontend/src/app/page.tsx`,
  `frontend/src/components/Hero.tsx` (new),
  `frontend/src/app/app/page.tsx`. `backend/` untouched, as instructed.

### 2026-09-07 — Dropped the theme toggle: dark mode only, permanently
- **Trigger:** User decided against a light/dark toggle — the app should
  be dark-only, no light theme code path left active, plus wanted cursor
  affordance fixed on all clickable buttons and the same visual treatment
  applied consistently on `/app`, not just the landing page.
- **Theme system removed, not just hidden:** Deleted
  `frontend/src/components/ThemeToggle.tsx` entirely.
  `frontend/src/app/layout.tsx` lost the pre-hydration theme-init
  `<script>` and `suppressHydrationWarning` (no longer needed — nothing
  toggles a class at runtime). Every `dark:` Tailwind variant across
  `page.tsx` and `app/page.tsx` was collapsed to a single flat value (the
  dark one) — e.g. `bg-white dark:bg-neutral-900` → `bg-neutral-900`,
  `text-neutral-900 dark:text-neutral-50` → `text-neutral-50`. Confirmed
  zero `dark:` occurrences remain anywhere in `frontend/src` after the
  edit (`grep -rn "dark:" frontend/src` → empty).
  `globals.css` lost the `@custom-variant dark (...)` directive since
  nothing references it anymore — dead code, not just unused.
  `localStorage` persistence (`artefax-theme` key) is gone with the
  component that wrote it.
- **`<body>` now carries the fixed dark colors directly**
  (`bg-neutral-950 text-neutral-100` in `layout.tsx`) instead of a class
  that gets conditionally overridden.
- **Cursor affordance fixed:** every `<button>` and button-styled `<a>`/
  `<Link>` across both pages now has `cursor-pointer` explicitly (browsers
  don't give `<button>` a pointer cursor by default the way they do
  `<a href>` — this was the actual root cause of "buttons don't show a
  hand cursor"). Disabled buttons get `disabled:cursor-not-allowed`
  instead. Verified programmatically post-change via
  `getComputedStyle(el).cursor` on the Launch App, Analyze, Generate, and
  Download elements — all report `pointer`.
- **Visual polish added on top of the now-single dark theme** (this was
  explicitly scoped as "add designs to the dark theme, not switch back to
  light"): a faint CSS grid-line texture behind the landing hero (radial
  mask-fade, no image asset), a soft glow (`box-shadow`) on primary CTA
  buttons on both pages, hover border/text transitions on cards and
  secondary buttons, a thin gradient hairline under both headers. No new
  dependency was added — all CSS gradients/shadows, inline `style`+
  Tailwind arbitrary values.
- **Verified a stray white flash in one screenshot was a capture
  artifact, not a real bug:** an early full-page screenshot mid-transition
  showed the Document Workspace card rendering near-white. Checked
  `getComputedStyle(el).backgroundColor` on every card (`rgba(0,0,0,0)` —
  transparent, body's dark background shows through correctly) and
  re-screenshotted after a longer settle — confirmed dark and consistent.
  Root cause was almost certainly the screenshot landing mid-`transition-
  colors` paint frame right after the newly-added hover transitions were
  introduced, not a persisted CSS issue.
- **Files touched:** `frontend/src/app/page.tsx`,
  `frontend/src/app/app/page.tsx`, `frontend/src/app/layout.tsx`,
  `frontend/src/app/globals.css`; deleted
  `frontend/src/components/ThemeToggle.tsx`. `backend/` untouched, as
  instructed.

### 2026-09-07 — Added a landing page and real dark theme
- **Trigger:** User asked for a "decent landing page" and dark theme
  support for the site.
- **Routing change:** The app is no longer a single page. Introduced
  `/app` as the tool route (the existing Upload/Workspace/Generate/
  Results flow, moved as-is from `frontend/src/app/page.tsx` to
  `frontend/src/app/app/page.tsx`) and made `frontend/src/app/page.tsx` a
  new marketing landing page at `/` with a hero, an honest "why not just
  a chatbot" differentiation section, a 4-output feature grid, a
  how-it-works step list, and CTA buttons that link to `/app`. This is a
  deliberate, minimal exception to the original "no routing complexity"
  guidance — a landing page inherently implies a separate route from the
  tool itself.
- **Dark theme — done properly this time, not OS-inherited:** Switched
  from implicit `prefers-color-scheme` (removed entirely on 2026-09-07
  earlier the same day, see below) to Tailwind v4's class-based dark mode
  via `@custom-variant dark (&:where(.dark, .dark *));` in
  `globals.css`. A `dark` class on `<html>` now drives every dark
  variant explicitly.
  - **User-controlled, not just OS-controlled:** Added
    `frontend/src/components/ThemeToggle.tsx`, a button (sun/moon inline
    SVG, no icon library) that toggles the class and persists the choice
    to `localStorage` under `artefax-theme`.
  - **No flash of wrong theme:** `frontend/src/app/layout.tsx` runs a
    small inline `<script>` in `<head>`, before hydration, that reads
    `localStorage` (falling back to OS `prefers-color-scheme` if the user
    has never toggled) and sets the `dark` class before first paint.
    `suppressHydrationWarning` is set on `<html>` and `<body>` since this
    script intentionally changes the class outside React's render.
  - Every `dark:` variant was added by hand across `page.tsx` (landing)
    and `app/page.tsx` (tool) — pills, cards, buttons, form inputs,
    status badges, borders. No new dependency was added for this.
  - **Verified, not just eyeballed:** headless-browser test that clicks
    the real in-page toggle (not `prefers-color-scheme` emulation),
    screenshots both themes on both routes, reloads to confirm the choice
    persists with no flash, and runs the full upload→analyze→generate
    flow in dark mode to confirm pills/cards/status badges all stay
    readable with real generated content, not just the empty state. Zero
    console errors throughout.
- **Files touched:** `frontend/src/app/page.tsx` (rewritten as landing
  page), `frontend/src/app/app/page.tsx` (new — moved tool),
  `frontend/src/components/ThemeToggle.tsx` (new),
  `frontend/src/app/layout.tsx`, `frontend/src/app/globals.css`.

### 2026-09-07 — Frontend polish pass: branding, contrast fix, language field removed
- **Trigger:** User-supplied frontend-only follow-up brief ("Artefax").
- **Branding:** Project named **ARTEFAX**. Added as a bold wordmark +
  small uppercase tagline ("Analyze once. Transform many.") in the page
  header, visible above every section since this is a single-page app.
  Also set as the browser tab `<title>`.
- **Language field removed from UI:** The Generation Config screen no
  longer shows a Language input. `frontend/src/lib/api.ts`'s
  `GenerationConfig.language` field is still sent on every request, now
  hardcoded client-side to `"English"` (`FIXED_LANGUAGE` constant in
  `page.tsx`). **No backend change was needed or made** — confirmed
  `backend/app/schemas/brief.py`'s `GenerationConfig.language` is a plain
  `str` with a default, not a server-enforced enum, so the API contract
  is unaffected by simply not exposing the field client-side.
- **Fixed real contrast bug (not just a class tweak):** The topic/entity
  pills weren't low-contrast because of their own Tailwind classes —
  `frontend/src/app/globals.css` had a `prefers-color-scheme: dark` media
  query that flips `--foreground` to near-white while pill backgrounds
  stayed light grey with no dark variant. On a judge's laptop set to OS
  dark mode, this produced near-white text on a near-white pill —
  invisible. Removed the dark-mode override entirely; this app renders
  one fixed light theme. Also stopped relying on inherited body text
  color anywhere — every pill/label/heading now sets its own explicit
  Tailwind text color class, and pills gained a visible border
  (`border-neutral-300`) as a second layer of defense against this class
  of bug recurring.
- **Visual pass:** Numbered circular step badges on section headings,
  selected-output checkboxes get a filled black background instead of
  just a checked checkbox, uppercase tracking-wide labels on form fields,
  download buttons get a black hover state. Stayed strictly
  black/white/grey — no accent color added, per the brief's "black and
  white is fine" guidance.
- **Verified via headless-browser test** in both `light` and emulated
  `dark` OS color-scheme (`page.emulateMedia({ colorScheme })`) —
  confirmed the page renders identically in both, proving the theme is
  genuinely pinned, not just visually similar by luck. Also confirmed
  programmatically that "Language" does not appear anywhere in the
  rendered page text, before and after analysis.
- **Files touched:** `frontend/src/app/page.tsx` (full rewrite),
  `frontend/src/app/globals.css`, `frontend/src/app/layout.tsx`.
  `backend/` untouched, as instructed.

### 2026-09-07 — Switched default model to `gemini-flash-lite-latest`
- **Trigger:** Live testing hit `429 RESOURCE_EXHAUSTED` on
  `gemini-3.6-flash` — free tier on that model is capped at **20
  requests/day per project**, which is unworkable for iterative dev plus
  a live demo (analyze + 4 generates = 5 calls per test run).
- **Decision:** Default `MODEL_NAME` changed to `gemini-flash-lite-latest`,
  which sits in a separate, materially higher free-tier daily quota
  bucket. Verified working via direct API test and a full browser
  click-through with no quality regression on the demo document.
- **Also added:** `app/intelligence/gemini_client.py` — a shared
  `generate_structured()` helper used by both the analyzer and every
  transformer, with retry/backoff (up to 3 retries, exponential delay) on
  `429` and `503` errors specifically, so a transient overload or a
  near-quota blip doesn't fail a whole generate click.
- **Files touched:** `backend/app/config.py`, `backend/.env`,
  `backend/.env.example`, `backend/app/intelligence/analyzer.py`,
  `backend/app/intelligence/gemini_client.py` (new),
  `backend/app/transformation/base.py`, `README.md`.
- **If you hit quota/model errors again:** see the "Model name note" in
  `README.md` — it has the one-liner to list models available to your key.

### 2026-09-07 — Switched default model to `gemini-3.6-flash` (superseded above)
- **Trigger:** `gemini-2.5-flash` (the model named in the original spec)
  returned a hard `404 NOT_FOUND` on this API key: *"This model
  models/gemini-2.5-flash is no longer available to new users... use
  models/gemini-3.6-flash."* Confirmed genuine (not transient) by direct
  retry.
  - Note: `gemini-2.5-flash` interestingly still appears in the
    `client.models.list()` response for this key with `generateContent`
    listed as a supported action — the list endpoint doesn't reflect the
    new-user restriction. Don't trust `models.list()` alone to confirm a
    model actually works; do a real `generate_content` call.
- **Decision:** User explicitly wanted the full (non-lite) Flash tier, so
  went with Google's own suggested replacement, `gemini-3.6-flash`, over
  the always-current alias `gemini-flash-latest`.
- **Superseded same day** by the quota issue above — full Flash tiers
  have too low a free daily cap for this project's needs.

### 2026-09-07 — Fixed Gemini structured-output schema bug
- **Symptom:** `PresentationTransformer` failed every call with *"Default
  value is not supported in the response schema for the Gemini API."*
- **Root cause:** `PresentationSlide.speaker_notes: str = ""` — a plain
  scalar default. Gemini's `response_schema` JSON-schema conversion
  rejects fields with literal defaults. (list `Field(default_factory=list)`
  fields were fine — only literal/plain defaults broke it.)
- **Fix:** Removed the default; `speaker_notes` is now a required field
  (we always want it populated anyway). File:
  `backend/app/schemas/artifacts.py`.
- **Takeaway for future schemas:** any Pydantic model passed as a Gemini
  `response_schema` must have no field with a plain default value (`= ""`,
  `= 0`, `= None`, etc.). `default_factory=list` is safe.

### 2026-09-07 — Moved API key out of `.env.example`
- **Trigger:** A real Gemini API key was pasted directly into
  `backend/.env.example`, which is **not** gitignored (only `.env` is) —
  it would have been committed to git as plain text.
- **Fix:** Copied the key into `backend/.env` (gitignored), restored
  `.env.example` to a blank template.
- **Reminder:** never put real secrets in `.env.example` — it's a
  committed template file by convention.

### 2026-09-07 — Python venv architecture issues (macOS)
- Building the backend venv failed twice before succeeding:
  1. System default `python3` was **3.14** (arm64) — too new for the
     pinned `pydantic-core`'s Rust build toolchain (PyO3 didn't support
     3.14 yet at pin time).
  2. Retried with `/usr/local/bin/python3.11` — this turned out to be an
     **x86_64 (Intel/Rosetta) build**, which failed compiling
     `cryptography` from source (no target rustc toolchain for
     x86_64-apple-darwin without extra rustup setup).
  3. Succeeded with `/Library/Frameworks/Python.framework/Versions/3.13/bin/python3.13`
     — a native **arm64** build.
- **Takeaway:** on Apple Silicon, always confirm `python3 -c "import
  platform; print(platform.machine())"` prints `arm64` before creating the
  venv, or `pip install` will try to compile Rust-backed wheels from
  source and may fail for reasons unrelated to this project's code. This
  is now documented in `README.md`'s Apple Silicon note.

### Initial build (2026-09-07) — architecture choices from the master prompt
- `GEMINI_API_KEY` as the env var name (not `GOOGLE_API_KEY`) — matches
  most Gemini SDK examples.
- Synchronous generation (no queue/background jobs) — a demo-sized
  document with 4 outputs completes well within an HTTP timeout, and
  synchronous is far easier to debug live during the hackathon.
- SQLite stores serialized Pydantic models as JSON columns rather than a
  normalized relational schema — matches the "runs reliably in 24h" goal
  over "best practice" schema design.

---

## Fixed Roadmap

### Phase 0 — Scaffold (done)
- [x] Backend + frontend both boot, placeholder round-trip works
- [x] Gemini API key verified with a raw test call

### Phase 1 — Ingestion (done)
- [x] PDF text extraction (pypdf) + pasted text → `CanonicalDocument`
- [x] Naive heading-based section split
- [x] SQLite + filesystem storage wired in
- [x] Tested against a real multi-page PDF

### Phase 2 — Semantic analysis (done)
- [x] One Gemini structured-output call → `DocumentSemantics`
- [x] Wired into `GET /documents/{id}`

### Phase 3 — Content brief (done)
- [x] `ContentBrief` = semantics + `GenerationConfig`
- [x] `GenerationConfig` fields: audience, tone, language, detail_level,
      objective, style

### Phase 4 — Transformers (done)
- [x] `ExecutiveSummaryTransformer`
- [x] `LinkedInTransformer`
- [x] `AdvisoryTransformer`
- [x] `PresentationTransformer`
- [x] Each tested in isolation and via full pipeline

### Phase 5 — Validation (done)
- [x] Deterministic checks (required fields, non-empty, length, enum
      validity) — no re-prompting, just flag

### Phase 6 — Rendering (done)
- [x] PDF via reportlab (Executive Summary, Advisory)
- [x] PPTX via python-pptx (Presentation)
- [x] TXT for all types
- [x] All formats verified as real, openable files

### Phase 7 — API wiring (done)
- [x] `POST /api/documents`
- [x] `GET /api/documents/{id}`
- [x] `POST /api/documents/{id}/generate`
- [x] `GET /api/documents/{id}/artifacts`
- [x] `GET /api/artifacts/{id}/export?format=`

### Phase 8 — Frontend (done)
- [x] Upload (PDF drag/drop + paste text)
- [x] Document Workspace (title/summary/topics/entities/key points)
- [x] Generate (checkboxes + config dropdowns)
- [x] Results (cards with preview + per-format download)
- [x] Integrated against the real API (not mocked)

### Phase 9 — End-to-end hardening (done)
- [x] Tested with real demo PDF end-to-end
- [x] Browser-driven click-through test (Playwright), zero console errors
- [x] Retry/backoff on transient Gemini 429/503
- [x] Switched to a model with workable free-tier daily quota

### Phase 10 — Polish (in progress / time-permitting)
- [ ] Second sample document (different domain, to show generality)
- [ ] Loading-state polish on the frontend during generation (currently
      just a disabled button + "Generating..." label — fine for demo,
      could add per-card skeletons)
- [ ] DOCX export (stretch, only if time remains)
- [ ] Docker / docker-compose (stretch, only if time remains — explicitly
      not required for the demo per the original spec)

### Explicitly out of scope for this hackathon (do not build)
- Auth, hosted DB, RAG, observability tooling, image/video ingestion,
  video package / infographic generation UI (schema exists as a stub per
  spec, not wired to UI), agent frameworks.

---

## Known Constraints / Gotchas (keep this section current)

- **Gemini free-tier quota is per-model and can be as low as 20
  requests/day** on non-lite Flash models for a fresh API key. Lite
  models (`gemini-flash-lite-latest`, `gemini-3.1-flash-lite`, etc.) have
  materially higher free daily limits — this is why we default to lite.
  If you see `429 RESOURCE_EXHAUSTED`, check `MODEL_NAME` before assuming
  it's a bug.
- **Gemini model names/availability drift over time and per-key.** Always
  verify a model with a real `generate_content` call, not just
  `models.list()` (see the 2026-09-07 decision log entry above for why).
- **`response_schema` Pydantic models must not use plain scalar field
  defaults** (`= ""`, `= 0`, `= None`) — only `Field(default_factory=...)`
  is safe, or no default (required field). This bit us once on
  `PresentationSlide.speaker_notes`.
- **Don't leave `prefers-color-scheme: dark` CSS overrides in place
  unless the whole page is actually dark-mode-aware.** A partial override
  (global CSS variable flips, but individual components hardcode light-
  theme classes) silently produces invisible-contrast text for any judge
  or user on a dark-mode OS. `globals.css` no longer has this override —
  this app is a single fixed light theme by design. If dark mode is ever
  added back, every text/background color needs an explicit dark variant,
  not just the CSS variables.
- **Apple Silicon venv:** confirm `python3` is a native arm64 build before
  `pip install`, or Rust-backed wheel builds (`pydantic-core`,
  `cryptography`) can fail for architecture reasons unrelated to this
  project.
- Both dev servers run without hot-reload issues, but the backend uses
  `--reload`, so editing any backend file mid-demo will restart the
  server and drop in-flight requests — avoid editing backend code while
  live-demoing.

---

## How to update this file

After any change worth remembering:
1. If it changes current state, update the **Current Status** table.
2. If it's a decision (config change, bug fix with a non-obvious cause,
   architecture choice), add a dated entry to **Key Decisions Log**
   (newest first) — include what triggered it, what was decided, and
   what files it touched.
3. If it completes or adds a roadmap item, update **Fixed Roadmap**.
4. If it's a constraint someone will hit again, add it to **Known
   Constraints / Gotchas**.
