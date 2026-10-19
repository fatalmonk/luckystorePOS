from pathlib import Path
import sys

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.receipts.typesafe_noul_consistency import (
    decision_with_uncertainty,
    summarize_runs,
)


def test_decision_band_is_inclusive() -> None:
    assert decision_with_uncertainty(0.29) == "no"
    assert decision_with_uncertainty(0.30) == "uncertain"
    assert decision_with_uncertainty(0.50) == "uncertain"
    assert decision_with_uncertainty(0.70) == "uncertain"
    assert decision_with_uncertainty(0.71) == "yes"


@pytest.mark.parametrize("probability", [-0.01, 1.01, float("nan")])
def test_decision_rejects_invalid_probability(probability: float) -> None:
    with pytest.raises(ValueError, match="finite probability"):
        decision_with_uncertainty(probability)


def test_summarize_runs_preserves_probabilities_and_flags_threshold_crossing() -> None:
    runs = [
        {"valid_receipt": 0.29, "total_matches": 0.91},
        {"valid_receipt": 0.52, "total_matches": 0.93},
        {"valid_receipt": 0.71, "total_matches": 0.95},
    ]

    report = summarize_runs(runs)

    validity = report["questions"]["valid_receipt"]
    assert validity["probabilities"] == [0.29, 0.52, 0.71]
    assert validity["decisions"] == ["no", "uncertain", "yes"]
    assert validity["crosses_0_5"] is True
    assert validity["decision_counts"] == {"no": 1, "uncertain": 1, "yes": 1}
    assert report["mean_question_stddev"] > 0


def test_summarize_runs_requires_same_question_keys() -> None:
    with pytest.raises(ValueError, match="same question keys"):
        summarize_runs([{"a": 0.1}, {"b": 0.2}])
