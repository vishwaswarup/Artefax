# GenAI Content Transformation Platform

An AI platform that ingests a source document, builds one canonical
understanding of it ("Analyze Once"), and transforms that single
understanding into multiple audience-specific outputs — Executive Summary,
LinkedIn Post, Advisory, Presentation — each exported to a real file
(PDF/PPTX/TXT) ("Transform Many").

See [ARCHITECTURE.md](ARCHITECTURE.md) for the design and
[PRESENTATION_CONTENT.md](PRESENTATION_CONTENT.md) for slide content.

## Prerequisites

- Python 3.11+ (an arm64/native build — see the note below if you're on
  Apple Silicon and hit build errors with an x86_64 Python)
- Node.js 18+ and npm
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)
  (free tier, no credit card needed)

## 1. Backend setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `backend/.env` and set your key:

```
GEMINI_API_KEY=your-key-here
MODEL_NAME=gemini-flash-lite-latest
```

> **Model name note:** We default to `gemini-flash-lite-latest` instead of
> a full Flash model because free-tier daily quota is per-model and the
> full Flash tiers (`gemini-2.5-flash`, `gemini-3.6-flash`, etc.) are
> capped as low as **20 requests/day** on a fresh API key — enough for a
> couple of test runs, not a hackathon demo. Lite models get a
> substantially higher free daily quota. Gemini model availability and
> naming also changes over time and can vary by key (e.g. `gemini-2.5-flash`
> is already deprecated for new keys, replaced by `gemini-3.6-flash`). If
> generation calls fail with a 404 `NOT_FOUND` mentioning a deprecated
> model, or a 429 `RESOURCE_EXHAUSTED` mentioning a daily quota, list the
> models available to your key and pick a `-lite-` one:
>
> ```bash
> python3 -c "
> from google import genai
> import os
> from dotenv import load_dotenv
> load_dotenv()
> client = genai.Client(api_key=os.environ['GEMINI_API_KEY'])
> for m in client.models.list():
>     print(m.name)
> "
> ```

> **Apple Silicon note:** if `pip install -r requirements.txt` fails trying
> to compile `pydantic-core` or `cryptography` from source, your `python3`
> is likely a non-native (x86_64) build without prebuilt wheels available.
> Recreate the venv with a native arm64 Python 3.11+ interpreter (e.g. the
> official python.org installer, or `brew install python@3.12`).

Run the backend (from the `backend/` directory, with the venv active):

```bash
uvicorn app.main:app --reload
```

The API is now live at `http://localhost:8000`. Check `http://localhost:8000/api/health`.

## 2. Frontend setup

In a second terminal:

```bash
cd frontend
npm install
```

`frontend/.env.local` is already set to point at the backend:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Run the frontend:

```bash
npm run dev
```

Open `http://localhost:3000` — that's the landing page. Click **Launch
App** (or go directly to `http://localhost:3000/app`) for the tool. The
UI is dark-themed only — there is no light mode or toggle.

## 3. Try it

1. From `/app`, upload the sample document at
   `samples/exemplecorp_incident_report.pdf` (or paste any text) and
   click **Analyze**.
2. Once the Document Workspace shows the title/summary/topics/entities/key
   points, check one or more output types (Executive Summary, LinkedIn
   Post, Advisory, Presentation), pick audience/tone/etc., and click
   **Generate**.
3. Download each generated output as PDF/PPTX/TXT.

## Deploying to Render

`render.yaml` at the project root is a Render Blueprint that defines
both services together — a Python web service for the backend
(`backend/`) and a Node web service for the frontend (`frontend/`). The
backend's `FRONTEND_URL` and the frontend's `NEXT_PUBLIC_API_URL` are
wired to each other automatically via Render's `fromService`, so you
don't need to hardcode either URL once both services exist.

In the Render dashboard: **New > Blueprint**, connect this repo, and
Render will detect `render.yaml` and propose both services. You'll be
prompted to set `GEMINI_API_KEY` on the backend service — it's marked
`sync: false` in the Blueprint, meaning it's never committed and must be
set manually as a secret in the dashboard.

> **Data does not persist across deploys or restarts.** The backend
> stores its SQLite database (`backend/app.db`) and uploaded/generated
> files (`backend/storage/`) on local disk, which works fine for local
> dev but is **ephemeral** on Render's free/standard web service plans —
> every deploy or restart wipes it. For a hackathon demo this is fine
> (upload your document fresh each time you demo), but don't expect
> data to survive a redeploy. Persisting this for real would mean either
> a Render persistent disk (paid) or moving to a hosted Postgres +
> object storage — both explicitly out of scope for this MVP (see
> "Scope notes" below).
>
> **Free tier services sleep after inactivity** and take a noticeable
> few seconds to cold-start on the next request — worth doing a "wake up"
> request before a live demo rather than hitting it cold in front of an
> audience.

## Project layout

```
backend/     FastAPI app, SQLite metadata, local file storage, Gemini calls
frontend/    Next.js (App Router) + TypeScript + Tailwind
             src/app/page.tsx      landing page ("/")
             src/app/app/page.tsx  the tool (Upload/Workspace/Generate/Results)
samples/     Demo cybersecurity incident report PDF used for testing/demos
```

## Scope notes

This is a hackathon MVP. Deliberately out of scope: authentication, a
hosted database, RAG/"ask the document", observability tooling,
containerization, and ingestion formats beyond PDF and pasted text. See
`ARCHITECTURE.md` for why the core pipeline is structured the way it is.
