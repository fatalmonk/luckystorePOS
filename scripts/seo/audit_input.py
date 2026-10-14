"""Download and validate one trusted, current audit before Codex sees it."""
import argparse
import datetime as dt
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile

REPOSITORY = "fatalmonk/luckystorePOS"
WORKFLOW = "seo-technical-monitor.yml"
MAX_AGE_SECONDS = 24 * 60 * 60


def api(path):
    return json.loads(subprocess.check_output(["gh", "api", f"repos/{REPOSITORY}/{path}"]))


def validate_run(run, workflow_id, base_sha):
    if not isinstance(run, dict) or not isinstance(run.get("head_repository"), dict):
        raise ValueError("Invalid audit run metadata")
    if run.get("workflow_id") != workflow_id or run.get("head_repository", {}).get("full_name") != REPOSITORY:
        raise ValueError("Audit run repository/workflow identity does not match")
    if run.get("head_branch") != "main" or run.get("event") not in ("schedule", "workflow_dispatch"):
        raise ValueError("Only main schedule/manual audits are accepted")
    if run.get("status") != "completed" or run.get("conclusion") != "success" or run.get("head_sha") != base_sha:
        raise ValueError("Audit must complete successfully against the current starting commit")


def validate(report, run, workflow_id, base_sha, now=None):
    now = now or dt.datetime.now(dt.timezone.utc)
    validate_run(run, workflow_id, base_sha)
    if not isinstance(report, dict):
        raise ValueError("Invalid audit report object")
    if report.get("schema_version") != 2 or report.get("base_url") != "https://www.luckystore1947.com":
        raise ValueError("Unsupported audit report schema or target")
    if report.get("status") not in ("passed_sample", "issues_found", "incomplete"):
        raise ValueError("Audit report is unavailable or execution failed")
    provenance = report.get("provenance", {})
    if not isinstance(provenance, dict):
        raise ValueError("Invalid audit provenance object")
    expected_hash = hashlib.sha256(Path(__file__).with_name("technical_monitor.py").read_bytes()).hexdigest()
    if (provenance.get("repository") != REPOSITORY or provenance.get("checkout_commit") != base_sha
            or str(provenance.get("run_id")) != str(run.get("id"))
            or str(provenance.get("run_attempt")) != str(run.get("run_attempt"))
            or provenance.get("monitor_version") != "2" or provenance.get("monitor_sha256") != expected_hash):
        raise ValueError("Report provenance does not match the selected run and monitor")
    checked = dt.datetime.fromisoformat(report["checked_at_utc"])
    if checked.tzinfo is None:
        raise ValueError("Audit timestamp requires a timezone")
    age = (now - checked).total_seconds()
    if age < -300 or age > MAX_AGE_SECONDS:
        raise ValueError("Audit is stale or future-dated")
    coverage = report.get("coverage", {})
    if not isinstance(coverage, dict) or coverage.get("scope") != "sample" or coverage.get("full_site_verified") is not False:
        raise ValueError("Audit coverage scope is missing or unexpected")
    return report


def download(run_id, base_sha):
    workflow_id = api(f"actions/workflows/{WORKFLOW}")["id"]
    if not run_id:
        runs = api(f"actions/workflows/{workflow_id}/runs?branch=main&status=success&per_page=1")["workflow_runs"]
        if not runs:
            raise ValueError("No successful main audit available; run the technical monitor first")
        run_id = str(runs[0]["id"])
    if not str(run_id).isdigit():
        raise ValueError("Audit run ID must be numeric")
    run = api(f"actions/runs/{run_id}")
    # Check the origin before downloading any artifact.
    validate_run(run, workflow_id, base_sha)
    with tempfile.TemporaryDirectory(prefix="seo-audit-") as directory:
        subprocess.run(["gh", "run", "download", str(run_id), "--repo", REPOSITORY, "--name", f"seo-technical-report-{run['run_attempt']}", "--dir", directory], check=True)
        file = Path(directory) / "latest.json"
        if not file.is_file() or file.is_symlink() or file.stat().st_size > 2_000_000:
            raise ValueError("Missing or oversized audit report")
        report = json.loads(file.read_text())
    return validate(report, run, workflow_id, base_sha)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--run-id", default="")
    parser.add_argument("--base", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    try:
        report = download(args.run_id, args.base)
        Path(args.output).write_text(json.dumps(report, indent=2) + "\n")
        print(f"Accepted audit run {report['provenance']['run_id']}: {report['status']}; coverage is sampled")
    except (ValueError, KeyError, TypeError, OSError, subprocess.CalledProcessError) as exc:
        print(f"::error::Audit evidence unavailable ({type(exc).__name__}). Run the technical monitor on current main before Autopilot; no proposal generated.")
        raise SystemExit(1)
