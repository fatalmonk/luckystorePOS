"""
Lucky Store — TypeSafe System One Client
Native API integration for fast typed judgments (choice, noul, score).
Zero text generation / zero parsing hallucinations. Direct programmable common sense.
"""

from __future__ import annotations

import base64
import io
import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import urllib.error
import urllib.request
import uuid

try:
    from PIL import Image as PILImage, ImageOps as PILImageOps
    HAS_PILLOW = True
except ImportError:
    HAS_PILLOW = False

TYPESAFE_ENDPOINT = "https://api.typesafe.ai/v1/systemone"
DEFAULT_MODEL = "jev-latest"


def get_typesafe_api_key() -> Optional[str]:
    """
    Safely resolve TYPESAFE_API_KEY from environment, ~/.config/jev/credentials, or .env.secrets.
    Never exposes or logs the secret.
    """
    # 1. Environment variable
    key = os.environ.get("TYPESAFE_API_KEY")
    if key and key.strip():
        return key.strip()

    # 2. ~/.config/jev/credentials
    creds_path = Path.home() / ".config" / "jev" / "credentials"
    if creds_path.is_file():
        try:
            for line in creds_path.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if line.startswith("TYPESAFE_API_KEY="):
                    val = line.split("=", 1)[1].strip().strip('"').strip("'")
                    if val:
                        return val
        except Exception:
            pass

    # 3. .env.secrets in repo root
    repo_secrets = Path(__file__).resolve().parents[2] / ".env.secrets"
    if repo_secrets.is_file():
        try:
            for line in repo_secrets.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if line.startswith("TYPESAFE_API_KEY="):
                    val = line.split("=", 1)[1].strip().strip('"').strip("'")
                    if val:
                        return val
        except Exception:
            pass

    return None


class TypeSafeClient:
    """TypeSafe System One client for structured semantic evaluations."""

    def __init__(self, api_key: Optional[str] = None, model: str = DEFAULT_MODEL, timeout_seconds: float = 8.0):
        self.api_key = api_key or get_typesafe_api_key()
        if not self.api_key:
            raise ValueError("TYPESAFE_API_KEY is not set or found in environment / ~/.config/jev/credentials.")
        self.model = model
        self.timeout_seconds = timeout_seconds

    def evaluate(
        self,
        state: Any,
        questions: Dict[str, Any],
        model: Optional[str] = None,
        assets: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Evaluate state against a map of typed questions.
        Supports text, JSON, and visual image assets (via assets dict and TypeSafe-Danger-Zone-Images header).
        """
        payload: Dict[str, Any] = {
            "state": state,
            "model": model or self.model,
            "questions": questions,
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": "LuckyStore-TypeSafe/1.0",
        }

        if assets:
            payload["assets"] = assets
            headers["TypeSafe-Danger-Zone-Images"] = "true"

        body_bytes = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            TYPESAFE_ENDPOINT,
            data=body_bytes,
            headers=headers,
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=self.timeout_seconds) as resp:
                resp_bytes = resp.read()
                return json.loads(resp_bytes.decode("utf-8"))
        except urllib.error.HTTPError as e:
            err_body = ""
            try:
                err_body = e.read().decode("utf-8")
            except Exception:
                pass
            raise RuntimeError(f"TypeSafe API error HTTP {e.code}: {err_body or e.reason}")
        except urllib.error.URLError as e:
            raise RuntimeError(f"TypeSafe connection failed: {e.reason}")

    @staticmethod
    def create_image_asset(image_path: str | Path, max_dimension: int = 1568) -> Tuple[str, Dict[str, Any]]:
        """
        Prepare an image for TypeSafe System One per documentation rules:
        - Rotates upright (exif_transpose)
        - Scales longest side <= 1568px, >= 280px
        - Converts to standard baseline JPEG or PNG
        - Base64 encodes into an asset object with unique reference UUID
        """
        p = Path(image_path)
        if not p.is_file():
            raise FileNotFoundError(f"Image not found: {image_path}")

        fmt = "png" if p.suffix.lower() == ".png" else "jpg"

        if HAS_PILLOW:
            with PILImage.open(p) as img:
                img = PILImageOps.exif_transpose(img)
                # Ensure minimum dimensions (>= 280px)
                w, h = img.size
                if w < 280 or h < 280:
                    scale = max(280 / w, 280 / h)
                    img = img.resize((max(280, int(w * scale)), max(280, int(h * scale))), PILImage.Resampling.LANCZOS)
                # Ensure maximum dimensions (<= 1568px)
                img.thumbnail((max_dimension, max_dimension), PILImage.Resampling.LANCZOS)

                buffer = io.BytesIO()
                if fmt == "png":
                    img.save(buffer, format="PNG")
                else:
                    img = img.convert("RGB")
                    img.save(buffer, format="JPEG", quality=90)
                raw_bytes = buffer.getvalue()
        else:
            raw_bytes = p.read_bytes()

        b64_str = base64.b64encode(raw_bytes).decode("ascii")
        ref_id = f"img-{uuid.uuid4()}"
        return ref_id, {
            "type": "image",
            "format": fmt,
            "data_base64": b64_str,
        }

    @staticmethod
    def choice(instructions: Any, criteria: Dict[str, Any]) -> Dict[str, Any]:
        """Build a 'choice' question."""
        return {
            "type": "choice",
            "instructions": instructions,
            "criteria": criteria,
        }

    @staticmethod
    def noul(instructions: Any, criteria: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Build a 'noul' (yes/no probability) question."""
        q: Dict[str, Any] = {
            "type": "noul",
            "instructions": instructions,
        }
        if criteria:
            q["criteria"] = criteria
        return q

    @staticmethod
    def score(instructions: Any, criteria: List[Any]) -> Dict[str, Any]:
        """Build a 'score' (probability-weighted ordered rating) question."""
        return {
            "type": "score",
            "instructions": instructions,
            "criteria": criteria,
        }
