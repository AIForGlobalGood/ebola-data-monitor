import sys
from pathlib import Path

# Vercel runs this file from the repo root; backend code lives under backend/app.
BACKEND_ROOT = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND_ROOT))

from app.main import app  # noqa: E402, F401
