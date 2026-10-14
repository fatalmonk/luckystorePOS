import unittest
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

    def test_gsc_failure_is_blocked(self):
        report, _ = self.report({"gsc": {"result": "failure"}, "propose": {"result": "skipped"}})
        self.assertEqual(report["status"], "blocked")
        self.assertIn("gsc", report["reason"])

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


if __name__ == "__main__":
    unittest.main()
