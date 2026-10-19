"""Measure TypeSafe Noul self-consistency for Lucky Store receipt intake.

Runs a Lucky Store-specific receipt rubric repeatedly, preserves every P(true),
and routes middling probabilities to human review instead of forcing yes/no.
"""

from __future__ import annotations

import argparse
import json
import math
import statistics
import time
import uuid
from collections import Counter
from pathlib import Path
from typing import Any, Mapping, Sequence

from scripts.receipts.typesafe_client import DEFAULT_MODEL, TypeSafeClient

DEFAULT_SAMPLES = 15
UNCERTAINTY_LOW = 0.30
UNCERTAINTY_HIGH = 0.70

QUESTIONS = {
    "valid_receipt": "Is this an authentic supplier invoice or purchase receipt that should be booked to Lucky Store accounts?",
    "supplier_identifiable": "Can the supplier be identified reliably from the receipt evidence?",
    "purchase_date_present": "Does the receipt state a usable purchase or invoice date?",
    "line_items_legible": "Are the purchased line items and their amounts legible enough to enter into the ledger?",
    "total_present": "Does the receipt state a usable grand total?",
    "line_items_sum": "Do the visible line-item amounts add up to the stated grand total?",
    "currency_bdt": "Are the monetary amounts denominated in Bangladeshi taka (BDT)?",
    "duplicate_risk": "Is there evidence that this receipt may duplicate an existing ledger entry or previously submitted receipt?",
    "payment_only": "Is this evidence only a payment or transfer confirmation rather than a supplier receipt or invoice?",
    "tampering_risk": "Are there visible or textual indicators that warrant review for alteration or tampering?",
    "inventory_purchase": "Do the purchased goods appear relevant to Lucky Store inventory or store operations?",
    "manual_review": "Should a human review this receipt before it is posted to the ledger?",
    "auto_post_safe": "Is it safe to post this receipt to the ledger automatically without human review?",
    "evidence_complete": "Is the available receipt evidence complete enough to support accounting reconciliation?",
}


def decision_with_uncertainty(
    probability: float,
    low: float = UNCERTAINTY_LOW,
    high: float = UNCERTAINTY_HIGH,
) -> str:
    """Map P(true) to no/uncertain/yes using an inclusive review band."""
    if not math.isfinite(probability) or not 0.0 <= probability <= 1.0:
        raise ValueError("Expected a finite probability between 0 and 1")
    if not 0.0 <= low <= high <= 1.0:
        raise ValueError("Expected uncertainty bounds satisfying 0 <= low <= high <= 1")
    if probability < low:
        return "no"
    if probability > high:
        return "yes"
    return "uncertain"


def summarize_runs(
    runs: Sequence[Mapping[str, float]],
    low: float = UNCERTAINTY_LOW,
    high: float = UNCERTAINTY_HIGH,
) -> dict[str, Any]:
    """Summarize repeated rubrics without hiding their underlying probabilities."""
    if not runs:
        raise ValueError("At least one run is required")

    keys = list(runs[0])
    expected = set(keys)
    if any(set(run) != expected for run in runs):
        raise ValueError("All runs must contain the same question keys")

    questions: dict[str, Any] = {}
    stddevs: list[float] = []
    for key in keys:
        probabilities = [float(run[key]) for run in runs]
        decisions = [decision_with_uncertainty(value, low, high) for value in probabilities]
        stddev = statistics.pstdev(probabilities)
        stddevs.append(stddev)
        questions[key] = {
            "probabilities": probabilities,
            "mean": statistics.fmean(probabilities),
            "min": min(probabilities),
            "max": max(probabilities),
            "stddev": stddev,
            "crosses_0_5": min(probabilities) < 0.5 < max(probabilities),
            "decisions": decisions,
            "decision_counts": dict(Counter(decisions)),
            "needs_human_review": "uncertain" in decisions,
        }

    return {
        "sample_count": len(runs),
        "uncertainty_band": {"low": low, "high": high, "inclusive": True},
        "mean_question_stddev": statistics.fmean(stddevs),
        "questions": questions,
    }


def load_state(path: Path) -> dict[str, Any]:
    state = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(state, dict):
        raise ValueError("Input JSON must contain an object")
    return state


def run_consistency_experiment(
    state: Mapping[str, Any],
    samples: int = DEFAULT_SAMPLES,
    model: str = DEFAULT_MODEL,
    client: TypeSafeClient | None = None,
) -> dict[str, Any]:
    """Run the complete 14-Noul rubric repeatedly against one receipt state."""
    if samples < 2:
        raise ValueError("samples must be at least 2")
    api = client or TypeSafeClient(model=model, timeout_seconds=30.0)
    questions = {key: api.noul(instructions=text) for key, text in QUESTIONS.items()}

    runs: list[dict[str, float]] = []
    latencies_ms: list[float] = []
    response_models: list[str] = []
    for index in range(samples):
        sampled_state = {
            "uid": f"luckystore-receipt-{index}:{uuid.uuid4().hex[:8]}",
            "receipt": dict(state),
        }
        started = time.perf_counter()
        response = api.evaluate(state=sampled_state, questions=questions, model=model)
        latencies_ms.append((time.perf_counter() - started) * 1000)
        answers = response.get("answers", {})
        missing = [key for key in QUESTIONS if key not in answers]
        if missing:
            raise RuntimeError(f"TypeSafe response omitted answers: {', '.join(missing)}")
        runs.append({key: float(answers[key]["noul"]) for key in QUESTIONS})
        response_models.append(str(response.get("model", "unknown")))

    report = summarize_runs(runs)
    report.update(
        {
            "requested_model": model,
            "response_models": dict(Counter(response_models)),
            "mean_latency_ms": statistics.fmean(latencies_ms),
            "latencies_ms": latencies_ms,
        }
    )
    return report


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Repeat Lucky Store's 14-Noul receipt rubric and report consistency."
    )
    parser.add_argument("input", type=Path, help="Receipt evidence JSON file")
    parser.add_argument("--samples", type=int, default=DEFAULT_SAMPLES)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--output", type=Path, help="Optional JSON report path")
    args = parser.parse_args()

    report = run_consistency_experiment(
        load_state(args.input), samples=args.samples, model=args.model
    )
    rendered = json.dumps(report, indent=2, sort_keys=True)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered + "\n", encoding="utf-8")
        print(args.output)
    else:
        print(rendered)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
