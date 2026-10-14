"""Emit a deterministic outcome for successful, blocked and failed SEO runs."""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re


def build_report(needs, run_id, attempt, sha):
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
    if "failure" in jobs.values() or "cancelled" in jobs.values():
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
    report = {"schema_version": 1, "created_at": datetime.now(timezone.utc).isoformat(),
              "run_url": f"https://github.com/fatalmonk/luckystorePOS/actions/runs/{run_id}",
              "run_attempt": int(attempt), "base_sha": sha, "status": status,
              "reason": reason, "next_action": next_action, "jobs": jobs,
              "source_changed": changed, "pr_url": pr or None,
              "limitations": "Job success does not prove indexing, traffic gains, conversions or production deployment."}
    markdown = "\n".join([
        "## Lucky Store SEO run report", "", f"**Outcome:** `{status}`", "", reason, "",
        f"[Workflow run]({report['run_url']}) · attempt {attempt} · commit `{sha[:12]}`", "",
        "| Job | Result |", "| --- | --- |",
        *(f"| {name} | {result} |" for name, result in jobs.items()), "",
        f"**PR:** {pr or 'None created'}", "", f"**Next action:** {next_action}", "",
        report["limitations"], "",
    ])
    return report, markdown


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    report, markdown = build_report(json.loads(os.environ["SEO_JOB_RESULTS"]),
                                   os.environ["SEO_RUN_ID"], os.environ["SEO_RUN_ATTEMPT"],
                                   os.environ["SEO_BASE_SHA"])
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
