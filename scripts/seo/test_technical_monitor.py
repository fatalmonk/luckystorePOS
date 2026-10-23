"""Offline tests for parsing and evidence classification."""
import unittest
import copy
import datetime as dt
import hashlib
from pathlib import Path
from unittest.mock import patch, MagicMock
from technical_monitor import PageParser, parse_sitemap, robots_summary, schema_types, same_site, fetch, RestrictedRedirectHandler, run, MAX_SITEMAP_URLS, inspect_page
from audit_input import validate

class MonitorTests(unittest.TestCase):
    def test_sitemap_namespace(self):
        kind, urls = parse_sitemap('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://www.luckystore1947.com/</loc></url></urlset>')
        self.assertEqual(kind, 'urlset')
        self.assertEqual(len(urls), 1)

    def test_sitemap_index(self):
        kind, urls = parse_sitemap('<sitemapindex><sitemap><loc>https://www.luckystore1947.com/a.xml</loc></sitemap></sitemapindex>')
        self.assertEqual((kind, len(urls)), ('sitemapindex', 1))

    def test_html(self):
        p = PageParser()
        p.feed('<link rel="canonical" href="https://www.luckystore1947.com/"><link rel="alternate" hreflang="en-BD" href="/"><script type="application/ld+json">{"@type":["Store","GroceryStore"]}</script>')
        self.assertEqual(len(p.canonicals), 1)
        self.assertEqual(len(p.alternates), 1)
        self.assertIn('GroceryStore', schema_types(p.jsonld[0]['data']))

    def test_invalid_jsonld(self):
        p = PageParser()
        p.feed('<script type="application/ld+json">{broken}</script>')
        self.assertFalse(p.jsonld[0]['valid'])

    def test_robots_does_not_infer_allow(self):
        data = robots_summary('User-agent: *\nDisallow: /private\n')
        self.assertFalse(data['tracked_agents']['GPTBot']['explicit_group'])
        self.assertEqual(data['tracked_agents']['GPTBot']['rules'][0]['path'], '/private')

    def test_malformed_urls_are_rejected(self):
        self.assertFalse(same_site("https://[invalid"))
        self.assertFalse(same_site("http://www.luckystore1947.com/"))
        self.assertFalse(same_site("https://www.luckystore1947.com:8443/"))
        self.assertFalse(same_site("https://www.luckystore1947.com@evil.example/"))

    def test_fetch_rejects_unsafe_url_before_open(self):
        with patch("technical_monitor.urllib.request.build_opener") as opener:
            result = fetch("https://[invalid")
            self.assertIsNone(result["status"])
            opener.assert_not_called()

    def test_redirect_rejected_before_following(self):
        handler = RestrictedRedirectHandler()
        req = __import__("urllib.request", fromlist=["Request"]).Request("https://www.luckystore1947.com/")
        with self.assertRaises(ValueError):
            handler.redirect_request(req, None, 302, "Found", {}, "http://www.luckystore1947.com/")
        with self.assertRaises(ValueError):
            handler.redirect_request(req, None, 302, "Found", {}, "https://evil.example/")
        self.assertIsNotNone(handler.redirect_request(req, None, 302, "Found", {}, "https://luckystore1947.com/delivery"))

    def test_exact_cap_is_complete(self):
        entries = [f"https://www.luckystore1947.com/product/{i}" for i in range(MAX_SITEMAP_URLS)]
        def fake_fetch(url):
            if url.endswith("/robots.txt"):
                return {"status": 200, "url": url, "body": "User-agent: *\\nAllow: /"}
            if url.endswith("/sitemap.xml"):
                xml = "<urlset>" + "".join(f"<url><loc>{x}</loc></url>" for x in entries) + "</urlset>"
                return {"status": 200, "url": url, "body": xml}
            return {"status": 200, "url": url, "body": '<link rel="canonical" href="' + url + '">', "content_type": "text/html"}
        with patch("technical_monitor.fetch", side_effect=fake_fetch):
            result = run(sample_limit=0)
        self.assertEqual(result["checks"]["sitemap"]["url_count"], MAX_SITEMAP_URLS)
        self.assertTrue(result["checks"]["sitemap"]["complete"])

    def test_over_cap_is_incomplete_and_bounded(self):
        entries = [f"https://www.luckystore1947.com/product/{i}" for i in range(MAX_SITEMAP_URLS + 1)]
        def fake_fetch(url):
            if url.endswith("/robots.txt"):
                return {"status": 200, "url": url, "body": "User-agent: *\\nAllow: /"}
            if url.endswith("/sitemap.xml"):
                xml = "<urlset>" + "".join(f"<url><loc>{x}</loc></url>" for x in entries) + "</urlset>"
                return {"status": 200, "url": url, "body": xml}
            return {"status": 200, "url": url, "body": '<link rel="canonical" href="' + url + '">', "content_type": "text/html"}
        with patch("technical_monitor.fetch", side_effect=fake_fetch):
            result = run(sample_limit=0)
        self.assertIsNone(result["checks"]["sitemap"]["url_count"])
        self.assertFalse(result["checks"]["sitemap"]["complete"])

    def test_malformed_sitemap_loc_is_reported(self):
        def fake_fetch(url):
            if url.endswith("/robots.txt"):
                return {"status": 200, "url": url, "body": "User-agent: *\\nAllow: /"}
            if url.endswith("/sitemap.xml"):
                return {"status": 200, "url": url, "body": "<sitemapindex><sitemap><loc>https://[invalid</loc></sitemap></sitemapindex>"}
            return {"status": 200, "url": url, "body": '<link rel="canonical" href="' + url + '">', "content_type": "text/html"}
        with patch("technical_monitor.fetch", side_effect=fake_fetch):
            result = run(sample_limit=0)
        self.assertEqual(result["checks"]["sitemap"]["failures"][0]["error"], "off_site_sitemap")

    def test_sample_coverage_and_locale_homepages(self):
        base = 'https://www.luckystore1947.com'
        entries = [base + path for path in ('/', '/bn', '/delivery', '/bn/delivery', '/category/rice', '/bn/category/rice', '/brand/example', '/bn/brand/example', '/blog/example')]
        entries += [base + f'/product/{i}' for i in range(20)] + [base + f'/bn/product/{i}' for i in range(20)]
        def fake_fetch(url):
            if url.endswith('/robots.txt'):
                body = 'User-agent: *\nAllow: /'
            elif url.endswith('/sitemap.xml'):
                body = '<urlset>'+''.join(f'<url><loc>{item}</loc></url>' for item in entries)+'</urlset>'
            else:
                body = '<link rel="canonical" href="'+url+'">'
            return {'status':200,'url':url,'body':body,'content_type':'text/html'}
        with patch('technical_monitor.fetch', side_effect=fake_fetch):
            report=run()
        checked={page['requested_url'] for page in report['pages']}
        self.assertIn(base+'/bn',checked)
        self.assertEqual(report['coverage']['attempted_pages'],15)
        self.assertEqual(report['coverage']['skipped_sitemap_urls'],34)
        self.assertEqual(report['coverage']['failed_pages'],0)
        self.assertEqual(report['status'],'passed_sample')
        self.assertFalse(report['coverage']['full_site_verified'])

    def test_network_failure_is_unverified_not_confirmed_defect(self):
        with patch('technical_monitor.fetch',return_value={'status':None,'url':'https://www.luckystore1947.com/bn','error':'timeout'}):
            page=inspect_page('https://www.luckystore1947.com/bn')
        self.assertEqual(page['issues'],[])
        self.assertTrue(page['limitations'])

    def test_sitemap_transport_failure_is_unverified(self):
        def unavailable(url):
            return {'status':None,'url':url,'error':'timeout'}
        with patch('technical_monitor.fetch',side_effect=unavailable):
            report=run()
        self.assertEqual(report['issues'],[])
        self.assertEqual(report['status'],'incomplete')
        self.assertEqual(report['checks']['sitemap']['failures'][0]['classification'],'unverified')


class AuditInputTests(unittest.TestCase):
    def setUp(self):
        self.now=dt.datetime.now(dt.timezone.utc)
        self.run={'id':123,'run_attempt':2,'workflow_id':456,'head_repository':{'full_name':'fatalmonk/luckystorePOS'},'head_branch':'main','event':'schedule','status':'completed','conclusion':'success','head_sha':'abc'}
        self.report={'schema_version':2,'base_url':'https://www.luckystore1947.com','status':'passed_sample','checked_at_utc':self.now.isoformat(),
                     'coverage':{'scope':'sample','full_site_verified':False},
                     'provenance':{'repository':'fatalmonk/luckystorePOS','checkout_commit':'abc','run_id':'123','run_attempt':'2','monitor_version':'2','monitor_sha256':hashlib.sha256(Path(__file__).with_name('technical_monitor.py').read_bytes()).hexdigest()}}

    def test_current_matching_report_is_accepted(self):
        self.assertEqual(validate(self.report,self.run,456,'abc',self.now),self.report)

    def test_stale_future_and_naive_timestamps_rejected(self):
        for timestamp in ((self.now-dt.timedelta(hours=25)).isoformat(),(self.now+dt.timedelta(minutes=10)).isoformat(),self.now.replace(tzinfo=None).isoformat()):
            with self.subTest(timestamp=timestamp):
                report=copy.deepcopy(self.report); report['checked_at_utc']=timestamp
                with self.assertRaises(ValueError): validate(report,self.run,456,'abc',self.now)

    def test_untrusted_or_outdated_runs_rejected(self):
        for field,value in [('head_sha','old'),('workflow_id',999),('head_branch','feature'),('event','pull_request'),('conclusion','failure'),('head_repository',{'full_name':'other/repo'})]:
            with self.subTest(field=field):
                run=copy.deepcopy(self.run); run[field]=value
                with self.assertRaises(ValueError): validate(self.report,run,456,'abc',self.now)

    def test_provenance_mismatch_rejected(self):
        for field,value in [('run_id','321'),('run_attempt','1'),('monitor_version','1'),('monitor_sha256','wrong'),('checkout_commit','old')]:
            with self.subTest(field=field):
                report=copy.deepcopy(self.report); report['provenance'][field]=value
                with self.assertRaises(ValueError): validate(report,self.run,456,'abc',self.now)

    def test_incomplete_audit_is_review_only(self):
        report=copy.deepcopy(self.report)
        report['status']='incomplete'
        report['limitations']=['sitemap transport failure; count unverified']
        with self.assertRaises(ValueError):
            validate(report,self.run,456,'abc',self.now)

    def test_confirmed_issues_audit_is_accepted(self):
        report=copy.deepcopy(self.report)
        report['status']='issues_found'
        report['issues']=['sample: canonical mismatch']
        self.assertEqual(validate(report,self.run,456,'abc',self.now),report)

    def test_legacy_schema_and_execution_failure_rejected(self):
        for field,value in [('schema_version',1),('status','execution_failed'),('base_url','https://other.example')]:
            with self.subTest(field=field):
                report=copy.deepcopy(self.report); report[field]=value
                with self.assertRaises(ValueError): validate(report,self.run,456,'abc',self.now)

if __name__ == '__main__':
    unittest.main()
