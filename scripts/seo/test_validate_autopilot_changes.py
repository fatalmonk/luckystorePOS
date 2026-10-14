import unittest
from validate_autopilot_changes import check


class GuardTests(unittest.TestCase):
    def test_allows_storefront_plus_report(self):
        self.assertEqual(check(["apps/customer_storefront/src/app/page.tsx", "seo/reports/2026-10-14.md"]), [])

    def test_blocks_workflow(self):
        self.assertTrue(check([".github/workflows/seo.yml"]))

    def test_blocks_secrets(self):
        self.assertTrue(check(["apps/customer_storefront/.env.production"]))

    def test_blocks_checkout(self):
        self.assertTrue(check(["apps/customer_storefront/src/app/checkout/page.tsx"]))

    def test_blocks_dependencies(self):
        self.assertTrue(check(["apps/customer_storefront/package.json"]))

    def test_blocks_prompt_rewrite(self):
        self.assertTrue(check(["seo/codex-daily-prompt.md"]))

    def test_blocks_state_only(self):
        self.assertTrue(check(["seo/state.md"]))

    def test_blocks_large_changes(self):
        self.assertTrue(check(["apps/customer_storefront/a"+str(i)+".tsx" for i in range(13)]))


if __name__ == "__main__":
    unittest.main()
