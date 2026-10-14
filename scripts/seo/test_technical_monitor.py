"""Offline tests for parsing and evidence classification."""
import unittest
from unittest.mock import patch, MagicMock
from technical_monitor import PageParser, parse_sitemap, robots_summary, schema_types, same_site, fetch, RestrictedRedirectHandler, run, MAX_SITEMAP_URLS

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

if __name__ == '__main__':
    unittest.main()
