"""Emit a deterministic outcome for successful, blocked and failed SEO runs."""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re


def _gsc_snapshot_status(snapshot_path):
    if not snapshot_path:
        return "unverified"
    try:
        snapshot = json.loads(Path(snapshot_path).read_text())
    except (OSError, UnicodeError, json.JSONDecodeError):
        return "unverified"
    if not isinstance(snapshot, dict):
        return "unverified"
    if snapshot.get("status") == "unavailable":
        return "unavailable"
    if "status" in snapshot and snapshot.get("status") != "available":
        return "unverified"
    windows = snapshot.get("windows")
    if (snapshot.get("schema_version") != 1 or
            snapshot.get("source") != "Google Search Console Search Analytics API" or
            not isinstance(snapshot.get("captured_at"), str) or
            not isinstance(windows, dict) or set(windows) != {"current", "previous"}):
        return "unverified"
    for window in windows.values():
        if not isinstance(window, dict) or not isinstance(window.get("start_date"), str) or not isinstance(window.get("end_date"), str):
            return "unverified"
        for kind, dimensions in (("totals", []), ("pages", ["page"]), ("queries", ["query"])):
            result = window.get(kind)
            if (not isinstance(result, dict) or result.get("dimensions") != dimensions or
                    not isinstance(result.get("rows"), list) or
                    not isinstance(result.get("row_limit_reached"), bool)):
                return "unverified"
    return "available"


def build_report(needs, run_id, attempt, sha, gsc_snapshot_path=None):
    if not re.fullmatch(r"\d+", run_id) or not re.fullmatch(r"\d+", attempt):
        raise ValueError("Invalid run identity")
    if not re.fullmatch(r"[a-f0-9]{40}", sha):
        raise ValueError("Invalid commit")
    jobs = {name: needs.get(name, {}).get("result", "unknown")
            for name in ("gsc", "propose", "evidence", "verify", "publish")}
    allowed = {"success", "failure", "skipped", "cancelled", "unknown"}
    if any(result not in allowed for result in jobs.values()):
        raise ValueError("Invalid job result")
    outputs = needs.get("propose", {}).get("outputs", {})
    changed = outputs.get("changed") == "true"
    pr = needs.get("publish", {}).get("outputs", {}).get("pr_url", "")
    if pr and not re.fullmatch(r"https://github.com/fatalmonk/luckystorePOS/pull/\d+", pr):
        raise ValueError("Invalid PR URL")
    core_jobs = {name: result for name, result in jobs.items() if name != "gsc"}
    if "failure" in core_jobs.values() or "cancelled" in core_jobs.values() or (jobs["gsc"] in ("failure", "cancelled") and jobs["propose"] != "success"):
        status = "blocked"
        failed = ", ".join(name for name, result in jobs.items() if result in ("failure", "cancelled"))
        reason = f"Run requires attention: {failed}. No successful publication is inferred."
        next_action = "Open the failed job logs, resolve the reported cause, then run a fresh audit on current main."
    elif jobs["propose"] == "success" and outputs.get("overlap") == "true":
        status = "awaiting_review"
        reason = "An existing SEO autopilot PR awaits review; the workflow did not overwrite it."
        next_action = "Review the existing seo/codex-autopilot PR before generating another proposal."
    elif jobs["publish"] == "success" and pr:
        status = "proposal_created"
        reason = "A source proposal passed the required workflow jobs and a draft PR was created."
        next_action = "Review the draft PR; merge and production deployment remain separate steps."
    elif jobs["propose"] == "success" and not changed and outputs.get("guard") == "success":
        status = "no_change"
        reason = "Codex completed, but the validated workspace contained no source changes."
        next_action = "Review audit coverage and the SEO backlog for the next evidence-backed improvement."
    else:
        status = "not_completed"
        reason = "The workflow did not complete a verified proposal; inspect skipped jobs and trigger conditions."
        next_action = "Inspect the workflow run before retrying; do not infer a successful SEO change."
    evidence = {
        "technical_audit": _evidence_status(needs.get("propose", {}).get("outputs", {}).get("audit")),
        "gsc_performance": _gsc_snapshot_status(gsc_snapshot_path),
        "indexing": "not_verified",
        "ai_visibility": "not_verified",
        "production": "not_verified",
    }
    report = {"schema_version": 1, "created_at": datetime.now(timezone.utc).isoformat(),
              "run_url": f"https://github.com/fatalmonk/luckystorePOS/actions/runs/{run_id}",
              "run_attempt": int(attempt), "base_sha": sha, "status": status,
              "reason": reason, "next_action": next_action, "jobs": jobs,
              "evidence": evidence,
              "source_changed": changed, "pr_url": pr or None,
              "limitations": "Job success does not prove indexing, traffic gains, conversions or production deployment."}
    markdown = "\n".join([
        "## Lucky Store SEO run report", "", f"**Outcome:** `{status}`", "", reason, "",
        f"[Workflow run]({report['run_url']}) · attempt {attempt} · commit `{sha[:12]}`", "",
        "| Job | Result |", "| --- | --- |",
        *(f"| {name} | {result} |" for name, result in jobs.items()), "",
        "| Evidence | Status |",
        "| --- | --- |",
        *(f"| {name} | {status} |" for name, status in evidence.items()), "",
        f"**PR:** {pr or 'None created'}", "", f"**Next action:** {next_action}", "",
        report["limitations"], "",
    ])
    return report, markdown


def _evidence_status(result):
    if result == "success":
        return "available"
    if result in ("failure", "cancelled"):
        return "failed"
    if result == "skipped":
        return "unavailable"
    return "unverified"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--gsc-snapshot", default=os.environ.get("GSC_SNAPSHOT_PATH"))
    args = parser.parse_args()
    report, markdown = build_report(json.loads(os.environ["SEO_JOB_RESULTS"]),
                                   os.environ["SEO_RUN_ID"], os.environ["SEO_RUN_ATTEMPT"],
                                   os.environ["SEO_BASE_SHA"], args.gsc_snapshot)
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    (output / "report.json").write_text(json.dumps(report, indent=2) + "\n")
    (output / "report.md").write_text(markdown)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as summary:
            summary.write(markdown)
    print(f"SEO run outcome: {report['status']}")


if __name__ == "__main__":
    main()
