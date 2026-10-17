import unittest
import json
import os
import subprocess
import tempfile
from pathlib import Path
from run_report import build_report


class RunReportTests(unittest.TestCase):
    def report(self, needs):
        return build_report(needs, "123", "2", "a" * 40)

    def test_no_change_has_report_with_next_action(self):
        report, markdown = self.report({"gsc": {"result": "success"},
            "propose": {"result": "success", "outputs": {"changed": "false", "guard": "success"}}})
        self.assertEqual(report["status"], "no_change")
        self.assertIn("Next action", markdown)
        self.assertIsNone(report["pr_url"])
        self.assertEqual(report["evidence"]["gsc_performance"], "available")
        self.assertEqual(report["evidence"]["indexing"], "not_verified")

    def test_gsc_failure_is_blocked_when_propose_skipped(self):
        report, _ = self.report({"gsc": {"result": "failure"}, "propose": {"result": "skipped"}})
        self.assertEqual(report["status"], "blocked")
        self.assertIn("gsc", report["reason"])

    def test_gsc_failure_with_successful_proposal_is_not_blocked(self):
        url = "https://github.com/fatalmonk/luckystorePOS/pull/123"
        report, _ = self.report({"gsc": {"result": "failure"},
                                 "propose": {"result": "success", "outputs": {"changed": "true"}},
                                 "evidence": {"result": "success"},
                                 "verify": {"result": "success"},
                                 "publish": {"result": "success", "outputs": {"pr_url": url}}})
        self.assertEqual(report["status"], "proposal_created")
        self.assertEqual(report["evidence"]["gsc_performance"], "failed")

    def test_gsc_skipped_with_no_change_marks_unavailable(self):
        report, _ = self.report({"gsc": {"result": "skipped"},
                                 "propose": {"result": "success", "outputs": {"changed": "false", "guard": "success"}}})
        self.assertEqual(report["status"], "no_change")
        self.assertEqual(report["evidence"]["gsc_performance"], "unavailable")

    def test_existing_pr_reports_review_needed(self):
        report, _ = self.report({"propose": {"result": "success", "outputs": {"overlap": "true"}}})
        self.assertEqual(report["status"], "awaiting_review")

    def test_publication_failure_does_not_claim_success(self):
        report, _ = self.report({"propose": {"result": "success", "outputs": {"changed": "true"}},
                                "publish": {"result": "failure"}})
        self.assertEqual(report["status"], "blocked")

    def test_success_links_created_pr(self):
        url = "https://github.com/fatalmonk/luckystorePOS/pull/123"
        report, markdown = self.report({name: {"result": "success"} for name in
                                      ("gsc", "propose", "evidence", "verify")} |
                                      {"publish": {"result": "success", "outputs": {"pr_url": url}}})
        self.assertEqual(report["status"], "proposal_created")
        self.assertIn(url, markdown)

    def test_untrusted_output_is_not_rendered(self):
        with self.assertRaises(ValueError):
            self.report({"publish": {"result": "success", "outputs": {"pr_url": "javascript:bad"}}})
        with self.assertRaises(ValueError):
            self.report({"gsc": {"result": "<script>bad</script>"}})

    def test_cli_writes_json_markdown_and_summary(self):
        with tempfile.TemporaryDirectory() as directory:
            summary = os.path.join(directory, "summary.md")
            env = os.environ | {
                "SEO_JOB_RESULTS": json.dumps({
                    "gsc": {"result": "success"},
                    "propose": {"result": "success", "outputs": {"changed": "false", "guard": "success"}},
                }),
                "SEO_RUN_ID": "123",
                "SEO_RUN_ATTEMPT": "1",
                "SEO_BASE_SHA": "a" * 40,
                "GITHUB_STEP_SUMMARY": summary,
            }
            subprocess.run(
                ["python3", "run_report.py", "--output", directory],
                cwd=os.path.dirname(__file__), env=env, check=True,
            )
            report = json.loads(Path(directory, "report.json").read_text())
            self.assertEqual(report["status"], "no_change")
            self.assertIn("Lucky Store SEO run report", Path(directory, "report.md").read_text())
            self.assertIn("Outcome", Path(summary).read_text())

    def test_all_skipped_jobs_are_not_completed(self):
        report, _ = self.report({name: {"result": "skipped"} for name in
                                 ("gsc", "propose", "evidence", "verify", "publish")})
        self.assertEqual(report["status"], "not_completed")


if __name__ == "__main__":
    unittest.main()
