import unittest
from validate_autopilot_changes import check


class GuardTests(unittest.TestCase):
    def test_allows_storefront_plus_report(self):
        self.assertEqual(check(["apps/customer_storefront/app/(english)/page.tsx", "seo/reports/2026-10-14.md"]), [])

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
        self.assertTrue(check(["apps/customer_storefront/a"+str(i)+".tsx" for i in range(5)]))

    def test_blocks_more_than_two_source_pages(self):
        self.assertTrue(check([
            "apps/customer_storefront/app/(english)/page.tsx",
            "apps/customer_storefront/app/(bengali)/bn/page.tsx",
            "apps/customer_storefront/app/(english)/delivery/page.tsx",
            "seo/reports/2026-10-19.md"
        ]))


import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts/seo'))
import validate_autopilot_changes as guard
import jev_review as jev
import rendered_review as rendered


class Safeguards(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='seo-guard-')
        self.old = Path.cwd()
        os.chdir(self.tmp.name)
        self.page = Path('apps/customer_storefront/app/(english)/page.tsx')
        self.page.parent.mkdir(parents=True)
        self.page.write_text('export default function Page() { return <p>Example</p>; }\n')
        self.git('init', '-q')
        self.git('add', '.')
        self.git('-c', 'user.name=Validation', '-c', 'user.email=validation@example.invalid', 'commit', '-qm', 'baseline')
        self.base = self.git('rev-parse', 'HEAD').strip()

    def tearDown(self):
        os.chdir(self.old)
        self.tmp.cleanup()

    def git(self, *args):
        return subprocess.check_output(['git', *args], stderr=subprocess.DEVNULL).decode()

    def test_page_edit_and_new_report(self):
        self.page.write_text('updated')
        p = Path('seo/reports/new.md'); p.parent.mkdir(parents=True); p.write_text('report')
        self.assertEqual(guard.check(guard.changed_paths(self.base)), [])

    def test_unexpected_commit(self):
        self.page.write_text('updated'); self.git('add', '.')
        self.git('-c', 'user.name=Validation', '-c', 'user.email=validation@example.invalid', 'commit', '-qm', 'hidden')
        with self.assertRaises(ValueError): guard.changed_paths(self.base)

    def test_staged_forbidden_change_restored_in_worktree(self):
        p = Path('.github/workflows/bad.yml'); p.parent.mkdir(parents=True); p.write_text('bad')
        self.git('add', '.'); p.unlink()
        with self.assertRaises(ValueError): guard.changed_paths(self.base)

    def test_deleted_file(self):
        self.page.unlink()
        with self.assertRaises(ValueError): guard.changed_paths(self.base)

    def test_patch_prevalidation(self):
        self.page.write_text('updated')
        self.git('add', '.')
        artifact = Path(self.tmp.name) / 'proposal.patch'
        artifact.write_text(self.git('diff', '--cached', self.base))
        self.assertEqual(guard.check_patch(artifact), [])
        bad = Path('scripts/seo/validate_autopilot_changes.py')
        bad.parent.mkdir(parents=True); bad.write_text('raise SystemExit(0)')
        self.git('add', 'scripts')
        artifact.write_text(self.git('diff', '--cached', self.base))
        self.assertTrue(guard.check_patch(artifact))

    def test_symlink(self):
        self.page.unlink(); self.page.symlink_to('/etc/hosts')
        with self.assertRaises(ValueError): guard.changed_paths(self.base)

    def test_executable(self):
        self.page.chmod(0o755)
        with self.assertRaises(ValueError): guard.changed_paths(self.base)

    def test_protected_paths(self):
        for p in ['apps/customer_storefront/next.config.js', 'apps/customer_storefront/app/(english)/checkout/page.tsx', 'apps/customer_storefront/app/(english)/components/page.tsx', 'apps/customer_storefront/app/(english)/../page.tsx', 'seo/report.json']:
            self.assertTrue(guard.check([p]), p)

    def test_export_excludes_reports(self):
        self.page.write_text('updated')
        p=Path('seo/reports/new.md'); p.parent.mkdir(parents=True); p.write_text('report-not-exported')
        self.git('add', '.')
        state=jev.build_state(self.base)
        self.assertNotIn('report-not-exported', json.dumps(state))

    def test_export_refuses_disallowed_diff(self):
        p=Path('.env'); p.write_text('SECRET=not-exported')
        with self.assertRaises(ValueError): jev.build_state(self.base)

    def test_export_refuses_credential_shape(self):
        self.page.write_text('sk-or-v1-'+'a'*40)
        self.git('add', '.')
        with self.assertRaises(ValueError): jev.build_state(self.base)

    def test_missing_key_unreviewed(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertEqual(jev.review(self.base)['status'], 'unreviewed')

    def test_api_success_and_failures(self):
        self.page.write_text('updated'); self.git('add', '.')
        response={'model':'typesafe/jev-1.13','answers':{k:{'type':'choice','choice':'supported','confidence':0.8,'probabilities':{'supported':0.8,'unsupported':0.1,'contradicted':0.05,'unknown':0.05}} for k in jev.QUESTIONS},'usage':{'input_tokens':100,'cost':0.001}}
        from unittest.mock import MagicMock
        opener=MagicMock()
        opener.open.return_value.__enter__.return_value.read.return_value=json.dumps(response).encode()
        with patch.dict(os.environ, {'OPENROUTER_API_KEY':'dummy-key'}), patch('urllib.request.build_opener',return_value=opener):
            result=jev.review(self.base)
            self.assertEqual(result['status'],'reviewed')
            request=opener.open.call_args.args[0]
            self.assertEqual(request.full_url,'https://openrouter.ai/api/v1/systemone')
            self.assertEqual(json.loads(request.data)['model'],'typesafe/jev-1.13')
            opener.open.side_effect=TimeoutError('dummy-key must not appear in output')
            result=jev.review(self.base)
            self.assertEqual(result['status'],'unreviewed')
            self.assertNotIn('dummy-key',jev.markdown(result))
            opener.open.side_effect=None
            opener.open.return_value.__enter__.return_value.read.return_value=b'{}'
            self.assertEqual(jev.review(self.base)['status'],'unreviewed')

    def test_malformed_responses_rejected(self):
        good={'model':'typesafe/jev-1.13','answers':{k:{'type':'choice','choice':'supported','confidence':0.8,'probabilities':{'supported':0.8,'unsupported':0.1,'contradicted':0.05,'unknown':0.05}} for k in jev.QUESTIONS}}
        jev.validate_response(good)
        for v in [-1, float('nan'), True, 2]:
            bad=json.loads(json.dumps(good)); bad['answers']['claims']['confidence']=v
            with self.assertRaises(ValueError): jev.validate_response(bad)

    def test_valid_rendered_homepage(self):
        html='<link rel="canonical" href="https://www.luckystore1947.com/"><link rel="alternate" hreflang="en-BD" href="https://www.luckystore1947.com/"><link rel="alternate" hreflang="bn-BD" href="https://www.luckystore1947.com/bn"><link rel="alternate" hreflang="x-default" href="https://www.luckystore1947.com/">'
        rendered.check_html('/', html, {})
        with self.assertRaises(ValueError): rendered.check_html('/', html+'<meta name="robots" content="noindex">', {})
        with self.assertRaises(ValueError): rendered.check_html('/', html.replace('bn-BD','bn'), {})

    def test_faq_mismatch(self):
        schema={'@type':'FAQPage','mainEntity':[{'name':'Where?','acceptedAnswer':{'text':'Here.'}}]}
        html='<link rel="canonical" href="https://www.luckystore1947.com/delivery"><script type="application/ld+json">'+json.dumps(schema)+'</script>'
        with self.assertRaises(ValueError): rendered.check_html('/delivery',html,{})
        rendered.check_html('/delivery',html+'<p>Where?</p><p>Here.</p>',{})
        for attr in ['hidden', 'aria-hidden="true"', 'style="display: none"', 'style="visibility:hidden"']:
            with self.assertRaises(ValueError):
                rendered.check_html('/delivery',html+'<div '+attr+'><p>Where? Here.</p></div>',{})


if __name__ == '__main__':
    unittest.main()
