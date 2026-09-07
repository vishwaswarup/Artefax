import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
STORAGE_DIR = BASE_DIR / "storage"
UPLOADS_DIR = STORAGE_DIR / "uploads"
ARTIFACTS_DIR = STORAGE_DIR / "artifacts"
DB_PATH = BASE_DIR / "app.db"

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
MODEL_NAME = os.environ.get("MODEL_NAME", "gemini-flash-lite-latest")

# Deployed frontend origin for CORS (e.g. a Render service URL). Optional
# for local dev — localhost:3000 is always allowed regardless. May be a
# bare host (some hosting providers only expose the hostname, not a full
# URL, via inter-service env var references) or a full "https://..." URL;
# normalized to a full URL in main.py before use.
FRONTEND_URL = os.environ.get("FRONTEND_URL", "")
