from __future__ import annotations

from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any


class Severity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"


@dataclass
class Finding:
    module: str
    severity: Severity
    title: str
    message: str
    file_path: str | None = None
    line: int | None = None
    suggestion: str | None = None
    rule_id: str | None = None

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["severity"] = self.severity.value
        return data


@dataclass
class ModuleResult:
    module: str
    passed: bool
    findings: list[Finding] = field(default_factory=list)
    duration_ms: float = 0.0

    @property
    def critical_count(self) -> int:
        return sum(1 for f in self.findings if f.severity == Severity.CRITICAL)

    @property
    def high_count(self) -> int:
        return sum(1 for f in self.findings if f.severity == Severity.HIGH)

    @property
    def warning_count(self) -> int:
        return sum(1 for f in self.findings if f.severity in (Severity.MEDIUM, Severity.LOW))

    def to_dict(self) -> dict[str, Any]:
        return {
            "module": self.module,
            "passed": self.passed,
            "duration_ms": round(self.duration_ms, 2),
            "critical_count": self.critical_count,
            "high_count": self.high_count,
            "warning_count": self.warning_count,
            "findings": [f.to_dict() for f in self.findings],
        }
