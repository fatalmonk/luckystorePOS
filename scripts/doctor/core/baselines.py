from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Set

from .models import Finding


class BaselineManager:
    """Manages suppressed / grandfathered findings to avoid blocking on legacy debt."""

    def __init__(self, baseline_path: Path):
        self.baseline_path = baseline_path
        self.suppressed_hashes: Set[str] = set()
        self.load()

    @staticmethod
    def compute_hash(finding: Finding) -> str:
        raw = f"{finding.module}:{finding.rule_id or finding.title}:{finding.file_path or ''}:{finding.message}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]

    def load(self) -> None:
        if self.baseline_path.is_file():
            try:
                with open(self.baseline_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.suppressed_hashes = set(data.get("suppressions", []))
            except Exception:
                self.suppressed_hashes = set()

    def is_suppressed(self, finding: Finding) -> bool:
        return self.compute_hash(finding) in self.suppressed_hashes

    def save(self, findings: list[Finding]) -> None:
        hashes = sorted({self.compute_hash(f) for f in findings})
        payload = {
            "version": "1.0",
            "count": len(hashes),
            "suppressions": hashes,
        }
        with open(self.baseline_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)
