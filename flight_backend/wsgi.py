"""Shim so gunicorn launched from the repo root (manual Render Web Service)
can resolve flight_backend.wsgi even though the app lives in backend/."""

import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

sys.modules.pop("flight_backend", None)
sys.modules.pop("flight_backend.wsgi", None)

from flight_backend.wsgi import application  # noqa: E402
