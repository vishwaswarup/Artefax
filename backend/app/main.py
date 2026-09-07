from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import documents, export, generation
from app.config import FRONTEND_URL
from app.storage.db import init_db
from app.transformation import TRANSFORMER_REGISTRY  # noqa: F401 (registers transformers)

app = FastAPI(title="GenAI Content Transformation Platform")

# Local dev frontend is always allowed. The deployed frontend origin
# (e.g. Render) is added on top when FRONTEND_URL is set — some hosts
# only expose a bare hostname via inter-service env var references, so
# normalize to a full "https://" URL if no scheme is present.
allow_origins = ["http://localhost:3000"]
if FRONTEND_URL:
    origin = FRONTEND_URL if "://" in FRONTEND_URL else f"https://{FRONTEND_URL}"
    allow_origins.append(origin.rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

app.include_router(documents.router)
app.include_router(generation.router)
app.include_router(export.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
