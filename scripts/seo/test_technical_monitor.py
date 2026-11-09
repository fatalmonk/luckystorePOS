"""Offline tests for parsing and evidence classification."""
import unittest
import copy
import datetime as dt
import hashlib
import http.client
import io
import inspect
import json
import tempfile
import urllib.error
import urllib.parse
from email.message import Message
from pathlib import Path
from unittest.mock import patch, MagicMock
from technical_monitor import PageParser, parse_sitemap, robots_summary, schema_types, same_site, fetch, RestrictedRedirectHandler, UnsafeRedirectError, run, MAX_SITEMAP_URLS, inspect_page
from audit_input import validate


SECURITY_HEADERS = [
    ("X-Frame-Options", "SAMEORIGIN"),
    ("Referrer-Policy", "strict-origin-when-cross-origin"),
    ("X-Content-Type-Options", "nosniff"),
]
WORKFLOW_PATH = Path(__file__).resolve().parents[2] / ".github/workflows/seo-technical-monitor.yml"
TASK1_MANIFEST_PATH = Path(__file__).resolve().parents[2] / "seo/evidence/2026-11-09/task1-manifest.json"


def valid_html(url, lang="en", robots="index,follow", visible_text=None):
    visible_text = visible_text or ("Fresh groceries and household essentials available for delivery in Chattogram. " * 3)
    return f'''<!doctype html><html lang="{lang}"><head>
<title>Lucky Store delivery</title>
<meta name="description" content="Shop groceries from Lucky Store">
<meta name="robots" content="{robots}">
<link rel="canonical" href="{url}">
<link rel="alternate" hreflang="en-BD" href="https://www.luckystore1947.com/delivery">
<link rel="alternate" hreflang="bn-BD" href="https://www.luckystore1947.com/bn/delivery">
<script type="application/ld+json">{{"@type":"WebPage"}}</script>
</head><body><main>{visible_text}</main></body></html>'''


def page_response(url, body=None, status=200, headers=None, redirect_chain=None):
    body = valid_html(url) if body is None else body
    raw = body.encode("utf-8")
    response_headers = [("Content-Type", "text/html; charset=utf-8"), *SECURITY_HEADERS]
    if headers:
        response_headers.extend(headers)
    return {
        "status": status,
        "url": url,
        "content_type": "text/html; charset=utf-8",
        "body": body,
        "body_sha256": hashlib.sha256(raw).hexdigest(),
        "body_bytes": len(raw),
        "ttfb_ms": 12.5,
        "redirect_chain": redirect_chain or [],
        "response_headers": response_headers,
        "_raw_body": raw,
        "etag": None,
        "last_modified": None,
    }


def valid_page_response(url):
    path = urllib.parse.urlsplit(url).path
    lang = "bn" if path == "/bn" or path.startswith("/bn/") else "en"
    return page_response(url, valid_html(url, lang=lang))


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

    def test_hidden_and_aria_hidden_body_text_is_not_visible_content(self):
        p = PageParser()
        p.feed('''<html><body><main>
<div hidden>{hidden}</div>
<section aria-hidden="true">{aria_hidden}</section>
<input hidden>
<p>Visible storefront copy</p>
</main></body></html>'''.format(
            hidden="concealed " * 30,
            aria_hidden="screen-reader-hidden " * 30,
        ))
        self.assertEqual(" ".join(p.visible_text), "Visible storefront copy")

    def test_only_completed_react_stream_segments_count_as_visible_once(self):
        p = PageParser()
        p.feed('''<html><body><main>
<div hidden id="S:1">Completed product description</div>
<div hidden id="S:2">Incomplete stream content</div>
<div hidden>Genuinely hidden fallback content</div>
<script>$RC("B:1","S:1");$RC("B:1","S:1")</script>
</main></body></html>''')

        self.assertEqual(p.visible_text, ["Completed product description"])
        self.assertNotIn("Incomplete stream content", " ".join(p.visible_text))
        self.assertNotIn("Genuinely hidden fallback content", " ".join(p.visible_text))

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
        self.assertIsInstance(getattr(handler, "redirect_chain", None), list)
        req = __import__("urllib.request", fromlist=["Request"]).Request("https://www.luckystore1947.com/")
        with self.assertRaises(ValueError):
            handler.redirect_request(req, None, 302, "Found", {}, "http://www.luckystore1947.com/")
        with self.assertRaises(ValueError):
            handler.redirect_request(req, None, 302, "Found", {}, "https://evil.example/")
        self.assertIsNotNone(handler.redirect_request(req, None, 302, "Found", {}, "https://luckystore1947.com/delivery"))
        self.assertEqual(handler.redirect_chain[-1], {
            "status": 302,
            "from_url": "https://www.luckystore1947.com/",
            "to_url": "https://luckystore1947.com/delivery",
        })

    def test_fetch_records_raw_get_response_evidence(self):
        headers = Message()
        headers["Content-Type"] = "text/html; charset=utf-8"
        headers["Link"] = "</_next/static/app.css>; rel=preload; as=style"
        response = MagicMock()
        response.__enter__.return_value = response
        response.geturl.return_value = "https://www.luckystore1947.com/delivery"
        response.status = 200
        response.headers = headers
        response.read.return_value = b"hello"
        with patch("technical_monitor.urllib.request.build_opener") as build_opener:
            build_opener.return_value.open.return_value = response
            result = fetch("https://www.luckystore1947.com/delivery")
        self.assertEqual(result.get("body_bytes"), 5)
        self.assertEqual(result.get("response_headers"), [
            ("Content-Type", "text/html; charset=utf-8"),
            ("Link", "</_next/static/app.css>; rel=preload; as=style"),
        ])
        self.assertEqual(result.get("redirect_chain"), [])
        self.assertIsInstance(result.get("ttfb_ms"), float)

    def test_http_error_ttfb_stops_before_body_download(self):
        url = "https://www.luckystore1947.com/delivery"
        clock = [10.0]

        class SlowErrorBody(io.BytesIO):
            def read(self, *args, **kwargs):
                clock[0] = 15.0
                return super().read(*args, **kwargs)

        headers = Message()
        headers["Content-Type"] = "text/html"
        error = urllib.error.HTTPError(url, 503, "Unavailable", headers, SlowErrorBody(b"error"))
        with patch("technical_monitor.urllib.request.build_opener") as build_opener, patch(
            "technical_monitor.time.perf_counter", side_effect=lambda: clock[0]
        ):
            build_opener.return_value.open.side_effect = error
            result = fetch(url)
        self.assertEqual(result["ttfb_ms"], 0.0)

    def test_oversized_http_error_body_is_truncated_and_marked(self):
        url = "https://www.luckystore1947.com/delivery"
        headers = Message()
        headers["Content-Type"] = "text/html"
        error = urllib.error.HTTPError(url, 503, "Unavailable", headers, io.BytesIO(b"12345"))
        with patch("technical_monitor.MAX_BYTES", 4), patch(
            "technical_monitor.urllib.request.build_opener"
        ) as build_opener:
            build_opener.return_value.open.side_effect = error
            result = fetch(url)
        self.assertEqual(result["_raw_body"], b"1234")
        self.assertEqual(result["body_bytes"], 4)
        self.assertTrue(result["response_truncated"])

    def test_unsafe_redirect_is_classified_as_confirmed_page_issue(self):
        with patch("technical_monitor.urllib.request.build_opener") as build_opener:
            opener = build_opener.return_value
            opener.open.side_effect = UnsafeRedirectError("blocked unsafe redirect destination")
            result = fetch("https://www.luckystore1947.com/delivery")
        self.assertEqual(result["status"], 0)
        with patch("technical_monitor.fetch", return_value=result):
            page = inspect_page("https://www.luckystore1947.com/delivery")
        self.assertIn("redirected_off_site", page["issues"])
        self.assertFalse(page["limitations"])

    def test_blank_canonical_href_is_an_issue(self):
        url = "https://www.luckystore1947.com/delivery"
        html = valid_html(url).replace(
            f'<link rel="canonical" href="{url}">',
            '<link rel="canonical">',
        )
        with patch("technical_monitor.fetch", return_value=page_response(url, html)):
            page = inspect_page(url)
        self.assertIn("canonical_missing_href", page["issues"])

    def test_successful_html_reports_head_placement_headers_and_route_identity(self):
        url = "https://www.luckystore1947.com/bn/delivery"
        response = page_response(
            url,
            valid_html(url, lang="bn"),
            headers=[
                ("Link", f'<{url}>; rel="canonical", </_next/static/app.css>; rel=preload; as=style'),
                ("X-Build-Sha", "a" * 40),
            ],
        )
        with patch("technical_monitor.fetch", return_value=response):
            page = inspect_page(url)
        self.assertEqual(page.get("metadata_placement"), {
            "head_closed": True,
            "canonical": {"head": 1, "body": 0},
            "title": {"head": 1, "body": 0},
            "description": {"head": 1, "body": 0},
            "robots": {"head": 1, "body": 0},
            "hreflang": {"head": 2, "body": 0},
        })
        self.assertEqual(page.get("canonical_header_urls"), [url])
        self.assertEqual(page.get("html_lang"), "bn")
        self.assertEqual(page.get("route_identity"), {
            "requested_path": "/bn/delivery",
            "final_path": "/bn/delivery",
            "requested_locale": "bn",
            "final_locale": "bn",
            "route_family": "delivery",
            "sitemap_eligible": False,
            "build_sha": "a" * 40,
        })
        self.assertEqual(page["response_evidence"].get("body_bytes"), response["body_bytes"])
        self.assertEqual(page["response_evidence"].get("ttfb_ms"), 12.5)
        self.assertEqual(page["response_evidence"].get("redirect_chain"), [])
        self.assertFalse(page["issues"])

    def test_body_metadata_is_flagged_separately(self):
        url = "https://www.luckystore1947.com/delivery"
        html = f'''<!doctype html><html lang="en"><head></head><body><main>{"visible " * 30}</main>
<title>Late title</title><meta name="description" content="late"><meta name="robots" content="index,follow">
<link rel="canonical" href="{url}"><link rel="alternate" hreflang="bn-BD" href="/bn/delivery"></body></html>'''
        with patch("technical_monitor.fetch", return_value=page_response(url, html)):
            page = inspect_page(url)
        self.assertEqual(page.get("metadata_placement", {}).get("canonical"), {"head": 0, "body": 1})
        for issue in ("canonical_in_body", "title_in_body", "description_in_body", "robots_in_body", "hreflang_in_body"):
            with self.subTest(issue=issue):
                self.assertIn(issue, page["issues"])

    def test_partial_html_is_a_limitation_not_a_pass(self):
        url = "https://www.luckystore1947.com/delivery"
        partial = '<!doctype html><html lang="en"><head><title>Lucky Store</title>'
        with patch("technical_monitor.fetch", return_value=page_response(url, partial)):
            page = inspect_page(url)
        self.assertFalse(page["metadata_placement"]["head_closed"])
        self.assertIn("partial_html_response; metadata placement unverified", page["limitations"])
        self.assertEqual(page["issues"], [])

    def test_http_206_is_a_partial_response_limitation(self):
        url = "https://www.luckystore1947.com/delivery"
        with patch("technical_monitor.fetch", return_value=page_response(url, status=206)):
            page = inspect_page(url)
        self.assertIn("partial_content_206", page["limitations"])
        self.assertEqual(page["issues"], [])

    def test_truncated_200_after_head_is_a_limitation_not_a_pass(self):
        url = "https://www.luckystore1947.com/delivery"
        truncated = valid_html(url).replace("</body></html>", "")
        with patch("technical_monitor.fetch", return_value=page_response(url, truncated)):
            page = inspect_page(url)
        self.assertEqual(page.get("document_closed"), False)
        self.assertIn("partial_html_response; document not closed", page["limitations"])
        self.assertEqual(page["issues"], [])

    def test_empty_title_and_description_fail_the_head_contract(self):
        url = "https://www.luckystore1947.com/delivery"
        html = valid_html(url).replace(
            "<title>Lucky Store delivery</title>",
            "<title> </title>",
        ).replace(
            '<meta name="description" content="Shop groceries from Lucky Store">',
            '<meta name="description" content=" ">',
        )
        with patch("technical_monitor.fetch", return_value=page_response(url, html)):
            page = inspect_page(url)
        self.assertIn("expected_exactly_one_title_in_head", page["issues"])
        self.assertIn("expected_exactly_one_description_in_head", page["issues"])

    def test_canonical_header_mismatch_ignores_discovery_links(self):
        url = "https://www.luckystore1947.com/delivery"
        other = "https://www.luckystore1947.com/other"
        response = page_response(url, headers=[
            ("Link", '</_next/static/app.css>; rel="preload"; as="style"'),
            ("Link", f'<{other}>; rel="canonical"'),
        ])
        with patch("technical_monitor.fetch", return_value=response):
            page = inspect_page(url)
        self.assertEqual(page.get("canonical_header_urls"), [other])
        self.assertIn("canonical_header_tag_mismatch", page["issues"])

    def test_sitemap_url_wrong_same_site_canonical_is_an_issue(self):
        url = "https://www.luckystore1947.com/delivery"
        other = "https://www.luckystore1947.com/other"
        html = valid_html(url).replace(
            f'<link rel="canonical" href="{url}">',
            f'<link rel="canonical" href="{other}">',
        )
        with patch("technical_monitor.fetch", return_value=page_response(url, html)):
            page = inspect_page(url, sitemap_eligible=True)
        self.assertIn("sitemap_url_canonical_mismatch", page["issues"])
        self.assertNotIn("canonical_differs_from_final_url_check_intent", page["warnings"])

    def test_discovery_link_header_is_not_a_canonical_signal(self):
        url = "https://www.luckystore1947.com/delivery"
        with patch("technical_monitor.fetch", return_value=page_response(
            url, headers=[("Link", '</_next/static/app.css>; rel="preload"; as="style"')]
        )):
            page = inspect_page(url)
        self.assertEqual(page.get("canonical_header_urls"), [])
        self.assertNotIn("canonical_header_tag_mismatch", page["issues"])

    def test_canonical_link_header_without_target_is_malformed(self):
        url = "https://www.luckystore1947.com/delivery"
        with patch("technical_monitor.fetch", return_value=page_response(
            url, headers=[("Link", 'rel="canonical"')]
        )):
            page = inspect_page(url)
        self.assertEqual(page.get("canonical_header_urls"), [])
        self.assertIn("canonical_header_malformed", page["issues"])

    def test_malformed_html_canonical_is_scoped_and_run_continues(self):
        base = "https://www.luckystore1947.com"
        malformed_url = base + "/delivery"

        def fake_fetch(url):
            if url.endswith("/robots.txt"):
                return {"status": 200, "url": url, "body": "User-agent: *\nAllow: /"}
            if url.endswith("/sitemap.xml"):
                return {"status": 200, "url": url, "body": f"<urlset><url><loc>{malformed_url}</loc></url></urlset>"}
            response = valid_page_response(url)
            if url == malformed_url:
                response["body"] = valid_html(url).replace(
                    f'<link rel="canonical" href="{url}">',
                    '<link rel="canonical" href="https://[invalid">',
                )
            return response

        with patch("technical_monitor.fetch", side_effect=fake_fetch):
            try:
                report = run(base=base, sample_limit=0)
            except ValueError as exc:
                self.fail(f"malformed page canonical aborted run: {exc}")
        self.assertEqual(len(report["pages"]), 4)
        self.assertIn(f"{malformed_url}: canonical_malformed", report["issues"])

    def test_malformed_link_header_canonical_is_scoped_to_page(self):
        url = "https://www.luckystore1947.com/delivery"
        response = page_response(url, headers=[("Link", '<https://[invalid>; rel="canonical"')])
        with patch("technical_monitor.fetch", return_value=response):
            try:
                page = inspect_page(url)
            except ValueError as exc:
                self.fail(f"malformed Link canonical aborted page inspection: {exc}")
        self.assertIn("canonical_header_malformed", page["issues"])

    def test_missing_effective_security_headers_are_issues(self):
        url = "https://www.luckystore1947.com/delivery"
        response = page_response(url)
        response["response_headers"] = [("Content-Type", "text/html")]
        with patch("technical_monitor.fetch", return_value=response):
            page = inspect_page(url)
        for issue in (
            "security_header_x_frame_options_missing_or_unexpected",
            "security_header_referrer_policy_missing_or_unexpected",
            "security_header_x_content_type_options_missing_or_unexpected",
        ):
            with self.subTest(issue=issue):
                self.assertIn(issue, page["issues"])

    def test_duplicate_conflicting_security_headers_are_not_reduced_to_last_value(self):
        url = "https://www.luckystore1947.com/delivery"
        response = page_response(url, headers=[
            ("X-Frame-Options", "DENY"),
            ("X-Frame-Options", "SAMEORIGIN"),
        ])
        with patch("technical_monitor.fetch", return_value=response):
            page = inspect_page(url)
        self.assertEqual(page.get("security_header_values", {}).get("x-frame-options"), [
            "SAMEORIGIN", "DENY", "SAMEORIGIN",
        ])
        self.assertIn("security_header_x_frame_options_duplicate_or_conflicting", page["issues"])
        self.assertIn("security_header_x_frame_options_missing_or_unexpected", page["issues"])

    def test_429_is_a_limitation_and_other_non_200_classes_are_distinct(self):
        url = "https://www.luckystore1947.com/delivery"
        cases = (
            (429, None, "rate_limited_429"),
            (302, "unresolved_http_redirect", None),
            (404, "page_http_4xx", None),
            (503, "page_http_5xx", None),
        )
        for status, issue, limitation in cases:
            with self.subTest(status=status):
                response = page_response(url, "", status=status)
                response["error"] = f"HTTP {status}"
                with patch("technical_monitor.fetch", return_value=response):
                    page = inspect_page(url)
                if limitation:
                    self.assertIn(limitation, page["limitations"])
                    self.assertFalse(page["issues"])
                else:
                    self.assertIn(issue, page["issues"])

    def test_redirect_and_sitemap_locale_regressions_are_distinct(self):
        self.assertIn("sitemap_eligible", inspect.signature(inspect_page).parameters)
        requested = "https://www.luckystore1947.com/delivery"
        final = "https://www.luckystore1947.com/bn/delivery"
        response = page_response(final, valid_html(final, lang="bn"), redirect_chain=[{
            "status": 301,
            "from_url": requested,
            "to_url": final,
        }])
        with patch("technical_monitor.fetch", return_value=response):
            page = inspect_page(requested, sitemap_eligible=True)
        self.assertIn("redirect_changed_locale", page["issues"])
        self.assertIn("sitemap_url_redirects", page["issues"])

    def test_sitemap_noindex_and_thin_or_locale_inconsistent_html_are_issues(self):
        self.assertIn("sitemap_eligible", inspect.signature(inspect_page).parameters)
        url = "https://www.luckystore1947.com/bn/delivery"
        html = valid_html(url, lang="en", robots="noindex,follow", visible_text="thin")
        with patch("technical_monitor.fetch", return_value=page_response(url, html)):
            page = inspect_page(url, sitemap_eligible=True)
        self.assertIn("sitemap_url_noindex", page["issues"])
        self.assertIn("html_lang_mismatch", page["issues"])
        self.assertIn("insufficient_visible_content", page["issues"])

    def test_sitemap_x_robots_tag_noindex_is_an_issue(self):
        url = "https://www.luckystore1947.com/delivery"
        response = page_response(url, headers=[("X-Robots-Tag", "noindex, nofollow")])
        with patch("technical_monitor.fetch", return_value=response):
            page = inspect_page(url, sitemap_eligible=True)
        self.assertEqual(page.get("x_robots_tag"), ["noindex, nofollow"])
        self.assertIn("sitemap_url_noindex", page["issues"])

    def test_oversized_response_is_runner_limitation(self):
        with patch("technical_monitor.urllib.request.build_opener") as build_opener:
            response = build_opener.return_value.open.return_value.__enter__.return_value
            response.geturl.return_value = "https://www.luckystore1947.com/delivery"
            response.status = 200
            response.read.return_value = b"x" * 8_000_001
            result = fetch("https://www.luckystore1947.com/delivery")
        self.assertIsNone(result["status"])
        self.assertIn("8 MB limit", result["error"])

    def test_incomplete_response_is_runner_limitation(self):
        with patch("technical_monitor.urllib.request.build_opener") as build_opener:
            response = build_opener.return_value.open.return_value.__enter__.return_value
            response.geturl.return_value = "https://www.luckystore1947.com/delivery"
            response.status = 200
            response.read.side_effect = http.client.IncompleteRead(b"partial")
            result = fetch("https://www.luckystore1947.com/delivery")
        self.assertIsNone(result["status"])
        self.assertIn("IncompleteRead", result["error"])

    def test_off_site_sitemap_urls_are_reported_as_issues(self):
        base = "https://www.luckystore1947.com"
        def fake_fetch(url):
            if url.endswith("/robots.txt"):
                return {"status": 200, "url": url, "body": "User-agent: *\\nAllow: /"}
            if url.endswith("/sitemap.xml"):
                body = ("<urlset><url><loc>" + base + "/product/tea</loc></url>"
                        "<url><loc>https://other.example/product/tea</loc></url></urlset>")
                return {"status": 200, "url": url, "body": body}
            return valid_page_response(url)
        with patch("technical_monitor.fetch", side_effect=fake_fetch):
            report = run(sample_limit=0)
        self.assertEqual(report["coverage"]["unsafe_sitemap_urls"], 1)
        self.assertIn("off_site_sitemap_urls", report["issues"])
        self.assertEqual(report["status"], "issues_found")

    def test_exact_cap_is_complete(self):
        entries = [f"https://www.luckystore1947.com/product/{i}" for i in range(MAX_SITEMAP_URLS)]
        def fake_fetch(url):
            if url.endswith("/robots.txt"):
                return {"status": 200, "url": url, "body": "User-agent: *\\nAllow: /"}
            if url.endswith("/sitemap.xml"):
                xml = "<urlset>" + "".join(f"<url><loc>{x}</loc></url>" for x in entries) + "</urlset>"
                return {"status": 200, "url": url, "body": xml}
            return valid_page_response(url)
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
            return valid_page_response(url)
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
            return valid_page_response(url)
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
                return valid_page_response(url)
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
        self.assertTrue(all(page['route_identity']['sitemap_eligible'] for page in report['pages']))

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

    def test_rate_limited_resources_are_unverified_not_confirmed_defects(self):
        def rate_limited(url):
            return {"status": 429, "url": url, "error": "HTTP 429", "body": "", "response_headers": []}
        with patch("technical_monitor.fetch", side_effect=rate_limited):
            report = run(sample_limit=0)
        self.assertEqual(report["issues"], [])
        self.assertEqual(report["status"], "incomplete")
        self.assertEqual(report["checks"]["sitemap"]["failures"][0]["classification"], "unverified")
        self.assertIn("robots_unavailable", report["limitations"])

    def test_partial_robots_and_sitemap_are_unverified_not_confirmed_defects(self):
        def partial(url):
            return {"status": 206, "url": url, "body": "partial", "response_headers": []}
        with patch("technical_monitor.fetch", side_effect=partial):
            report = run(sample_limit=0)
        self.assertEqual(report["issues"], [])
        self.assertEqual(report["status"], "incomplete")
        self.assertEqual(report["checks"]["sitemap"]["failures"][0]["classification"], "unverified")
        self.assertIn("robots_unavailable", report["limitations"])

    def test_task1_manifest_marks_route_revisions_as_health_bracket_only(self):
        manifest = json.loads(TASK1_MANIFEST_PATH.read_text(encoding="utf-8"))
        current = manifest["postMergeCurrentProductionVerificationV2"]
        bracket = current["rawHttpCapture"]["healthBracket"]
        self.assertNotIn("captureValid", bracket)
        self.assertEqual(bracket["revisionBinding"], "health_bracket_only")
        self.assertFalse(bracket["perRouteRevisionBound"])
        self.assertIn(
            "individual route responses did not expose build identity",
            current["sampleConclusions"]["rawHttp"],
        )

    def test_run_writes_a_bounded_redacted_raw_evidence_manifest(self):
        self.assertIn("evidence_dir", inspect.signature(run).parameters)
        base = "https://www.luckystore1947.com"

        def fake_fetch(url):
            if url.endswith("/robots.txt"):
                return {"status": 200, "url": url, "body": "User-agent: *\nAllow: /"}
            if url.endswith("/sitemap.xml"):
                return {"status": 200, "url": url, "body": "<urlset></urlset>"}
            path = urllib.parse.urlsplit(url).path
            lang = "bn" if path == "/bn" or path.startswith("/bn/") else "en"
            response = page_response(url, valid_html(url, lang=lang, visible_text="evidence " * 5000))
            response["response_headers"].append(("Set-Cookie", "private-session-value"))
            return response

        with tempfile.TemporaryDirectory() as directory:
            with patch("technical_monitor.fetch", side_effect=fake_fetch):
                report = run(base=base, sample_limit=0, evidence_dir=directory, evidence_max_bytes=50_000)
            manifest_path = Path(directory) / "sampled-urls.json"
            self.assertTrue(manifest_path.is_file())
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            self.assertEqual([item["requested_url"] for item in manifest["sampled_urls"]], [
                base + "/", base + "/bn", base + "/delivery", base + "/bn/delivery",
            ])
            self.assertEqual(report["coverage"]["sampled_urls"], [
                base + "/", base + "/bn", base + "/delivery", base + "/bn/delivery",
            ])
            self.assertTrue(manifest["budget_exhausted"])
            self.assertEqual(manifest["redacted_header_names"], ["set-cookie"])
            evidence_bytes = sum(
                path.stat().st_size
                for path in Path(directory).iterdir()
            )
            self.assertLessEqual(evidence_bytes, 50_000)
            self.assertEqual(manifest["saved_bytes"], evidence_bytes)
            self.assertEqual(manifest["manifest_bytes"], manifest_path.stat().st_size)
            headers = "\n".join(
                path.read_text(encoding="utf-8")
                for path in Path(directory).glob("*.headers.txt")
            )
            self.assertNotIn("private-session-value", headers)
            self.assertIn("Set-Cookie: [REDACTED]", headers)

    def test_workflow_requires_raw_evidence_before_incident_recovery(self):
        workflow = WORKFLOW_PATH.read_text(encoding="utf-8")
        raw_upload = workflow.split("- name: Upload bounded raw response evidence", 1)[1].split(
            "- name: Classify and reconcile GitHub incident", 1
        )[0]
        incident = workflow.split("- name: Classify and reconcile GitHub incident", 1)[1]
        self.assertIn("id: raw_evidence", raw_upload)
        self.assertIn("if-no-files-found: error", raw_upload)
        self.assertIn("RAW_EVIDENCE_OUTCOME: ${{ steps.raw_evidence.outcome }}", incident)
        self.assertIn("const evidenceFailed = process.env.RAW_EVIDENCE_OUTCOME !== 'success';", incident)
        self.assertIn("const isIncident = failed || evidenceFailed ||", incident)


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

    def test_incomplete_issue_report_is_rejected(self):
        report=copy.deepcopy(self.report)
        report['status']='incomplete'
        report['issues']=['sample: canonical mismatch']
        report['limitations']=['sitemap transport failed']
        with self.assertRaises(ValueError):
            validate(report,self.run,456,'abc',self.now)

    def test_legacy_schema_and_execution_failure_rejected(self):
        for field,value in [('schema_version',1),('status','execution_failed'),('base_url','https://other.example')]:
            with self.subTest(field=field):
                report=copy.deepcopy(self.report); report[field]=value
                with self.assertRaises(ValueError): validate(report,self.run,456,'abc',self.now)

if __name__ == '__main__':
    unittest.main()
