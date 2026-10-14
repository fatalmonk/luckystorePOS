#!/usr/bin/env python3
"""Read-only Lucky Store technical SEO monitor. Python standard library only."""
import argparse
import datetime as dt
import hashlib
import json
import os
import re
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path

BASE = "https://www.luckystore1947.com"
MONITOR_VERSION = "2"
UA = "LuckyStoreSEOAudit/1.0 (+https://www.luckystore1947.com)"
TIMEOUT = 20
MAX_BYTES = 8_000_000
MAX_SITEMAP_URLS = 50000
TRACKED_BOTS = ("GPTBot", "PerplexityBot", "ClaudeBot", "Google-Extended", "Applebot-Extended", "cohere-ai")

class RestrictedRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Reject unsafe redirect destinations before any redirected request."""
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not same_site(newurl):
            raise ValueError("blocked unsafe redirect destination")
        return super().redirect_request(req, fp, code, msg, headers, newurl)

def fetch(url):
    if not same_site(url):
        return {"status": None, "url": url, "error": "blocked unsafe request URL"}
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html,application/xml,text/plain,*/*"})
    try:
        opener = urllib.request.build_opener(
            urllib.request.HTTPSHandler(context=ssl.create_default_context()),
            RestrictedRedirectHandler(),
        )
        with opener.open(req, timeout=TIMEOUT) as res:
            if not same_site(res.geturl()):
                raise ValueError("blocked unsafe final URL")
            body = res.read(MAX_BYTES + 1)
            if len(body) > MAX_BYTES:
                raise ValueError("response exceeds 8 MB limit")
            return {"status": res.status, "url": res.geturl(), "content_type": res.headers.get("Content-Type", ""), "body": body.decode("utf-8", errors="replace"),
                    "body_sha256": hashlib.sha256(body).hexdigest(), "etag": res.headers.get("ETag"), "last_modified": res.headers.get("Last-Modified")}
    except urllib.error.HTTPError as exc:
        return {"status": exc.code, "url": exc.geturl(), "error": f"HTTP {exc.code}"}
    except (urllib.error.URLError, TimeoutError, ValueError, OSError) as exc:
        return {"status": None, "url": url, "error": str(exc)}

def same_site(url):
    try:
        p = urllib.parse.urlsplit(url)
        return (p.scheme == "https"
                and p.hostname in {"luckystore1947.com", "www.luckystore1947.com"}
                and p.port in (None, 443)
                and not p.username and not p.password)
    except ValueError:
        return False

def parse_sitemap(xml):
    root = ET.fromstring(xml)
    kind = root.tag.rsplit("}", 1)[-1]
    if kind not in {"urlset", "sitemapindex"}:
        raise ValueError("not a sitemap")
    entries = []
    for child in root:
        if child.tag.rsplit("}", 1)[-1] not in {"url", "sitemap"}:
            continue
        loc = next((x.text.strip() for x in child if x.tag.rsplit("}", 1)[-1] == "loc" and x.text), None)
        if loc:
            entries.append(loc)
    return kind, entries

class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.canonicals = []
        self.alternates = []
        self.jsonld = []
        self._script = False
        self._parts = []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "link":
            rel = set((a.get("rel") or "").lower().split())
            if "canonical" in rel:
                self.canonicals.append(a.get("href"))
            if "alternate" in rel and a.get("hreflang"):
                self.alternates.append({"lang": a.get("hreflang"), "href": a.get("href")})
        if tag == "script" and (a.get("type") or "").lower() == "application/ld+json":
            self._script = True
            self._parts = []
    def handle_data(self, data):
        if self._script:
            self._parts.append(data)
    def handle_endtag(self, tag):
        if tag == "script" and self._script:
            raw = "".join(self._parts).strip()
            try:
                self.jsonld.append({"valid": True, "data": json.loads(raw)})
            except (ValueError, TypeError):
                self.jsonld.append({"valid": False, "error": "invalid JSON"})
            self._script = False
            self._parts = []

def schema_types(obj):
    found = set()
    if isinstance(obj, dict):
        t = obj.get("@type")
        if isinstance(t, str):
            found.add(t)
        elif isinstance(t, list):
            found.update(x for x in t if isinstance(x, str))
        for value in obj.values():
            found.update(schema_types(value))
    elif isinstance(obj, list):
        for value in obj:
            found.update(schema_types(value))
    return found

def inspect_page(url):
    res = fetch(url)
    out = {"requested_url": url, "final_url": res["url"], "http_status": res["status"], "issues": [], "warnings": [], "limitations": [],
           "response_evidence": {k: res.get(k) for k in ("body_sha256", "etag", "last_modified")}}
    if res["status"] is None:
        out["limitations"].append("page_unreachable_from_audit_runner; production defect unconfirmed")
        out["error"] = res.get("error")
        return out
    if res["status"] != 200:
        out["issues"].append("page_not_http_200_or_unreachable")
        out["error"] = res.get("error")
        return out
    if not same_site(res["url"]):
        out["issues"].append("redirected_off_site")
        return out
    if "html" not in res.get("content_type", "").lower():
        out["warnings"].append("unexpected_content_type")
    p = PageParser()
    p.feed(res["body"])
    out["canonical_urls"] = p.canonicals
    out["hreflang"] = p.alternates
    out["jsonld_blocks"] = len(p.jsonld)
    out["jsonld_types"] = sorted(set().union(*(schema_types(x["data"]) for x in p.jsonld if x["valid"])))
    if len(p.canonicals) != 1:
        out["issues"].append("expected_exactly_one_canonical")
    else:
        canonical = urllib.parse.urljoin(res["url"], p.canonicals[0] or "")
        if not same_site(canonical):
            out["issues"].append("canonical_off_site_or_not_https")
        if urllib.parse.urldefrag(canonical)[0].rstrip("/") != urllib.parse.urldefrag(res["url"])[0].rstrip("/"):
            out["warnings"].append("canonical_differs_from_final_url_check_intent")
    if any(not x["valid"] for x in p.jsonld):
        out["issues"].append("invalid_jsonld")
    if not p.jsonld:
        out["warnings"].append("no_jsonld_found")
    if not p.alternates:
        out["warnings"].append("no_hreflang_alternates")
    return out

def robots_summary(text):
    groups = {}
    agents = []
    rules = []
    def flush():
        for agent in agents:
            groups.setdefault(agent.lower(), []).extend(rules)
    for raw in text.splitlines() + [""]:
        line = raw.split("#", 1)[0].strip()
        if not line:
            if agents:
                flush()
            agents, rules = [], []
            continue
        if ":" not in line:
            continue
        k, v = (x.strip() for x in line.split(":", 1))
        if k.lower() == "user-agent":
            if rules:
                flush()
                agents, rules = [], []
            agents.append(v)
        elif agents and k.lower() in {"allow", "disallow"}:
            rules.append({"directive": k.lower(), "path": v})
    return {"tracked_agents": {bot: {"explicit_group": bot.lower() in groups, "rules": groups.get(bot.lower(), groups.get("*", []))} for bot in TRACKED_BOTS},
            "note": "Directive listing only. Effective allow/deny depends on path, longest-match precedence and crawler policy; no automatic unblocking."}

def run(base=BASE, sample_limit=3):
    now = dt.datetime.now(dt.timezone.utc).isoformat()
    report = {"schema_version": 2, "checked_at_utc": now, "base_url": base, "status": "completed", "checks": {}, "pages": [], "issues": [], "warnings": [], "limitations": [],
              "provenance": {"monitor_version": MONITOR_VERSION, "monitor_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                             "repository": os.environ.get("GITHUB_REPOSITORY"), "run_id": os.environ.get("GITHUB_RUN_ID"),
                             "run_attempt": os.environ.get("GITHUB_RUN_ATTEMPT"), "checkout_commit": os.environ.get("GITHUB_SHA"),
                             "deployed_commit": "unverified"}}
    robots = fetch(base + "/robots.txt")
    if robots["status"] == 200:
        report["checks"]["robots"] = {"http_status": 200, **robots_summary(robots["body"])}
    else:
        report["checks"]["robots"] = {"http_status": robots["status"], "error": robots.get("error")}
        report["limitations" if robots["status"] is None else "issues"].append("robots_unavailable")
    queue = [base + "/sitemap.xml"]
    seen = set()
    urls = []
    sitemap_failures = []
    truncated = False
    while queue and len(seen) < 25 and len(urls) < MAX_SITEMAP_URLS:
        url = queue.pop(0)
        if url in seen:
            continue
        seen.add(url)
        if not same_site(url):
            sitemap_failures.append({"url": url, "error": "off_site_sitemap"})
            continue
        res = fetch(url)
        if res["status"] != 200:
            sitemap_failures.append({"url": url, "http_status": res["status"], "classification": "unverified" if res["status"] is None else "issue", "error": res.get("error", "non_200")})
            continue
        try:
            kind, entries = parse_sitemap(res["body"])
            if kind == "sitemapindex":
                queue.extend(entries)
            else:
                remaining = MAX_SITEMAP_URLS - len(urls)
                urls.extend(entries[:remaining])
                if len(entries) > remaining:
                    truncated = True
        except (ET.ParseError, ValueError) as exc:
            sitemap_failures.append({"url": url, "error": str(exc)})
    incomplete = bool(queue) or truncated
    if incomplete:
        report["limitations"].append("sitemap traversal cap reached; count incomplete")
    if any(failure.get("classification") != "unverified" for failure in sitemap_failures):
        report["issues"].append("sitemap_fetch_or_parse_failure")
    if any(failure.get("classification") == "unverified" for failure in sitemap_failures):
        report["limitations"].append("sitemap transport failure from audit runner; production defect unconfirmed")
    report["checks"]["sitemap"] = {"sitemaps_checked": len(seen), "url_count": len(urls) if not sitemap_failures and not incomplete else None,
        "unique_url_count": len(set(urls)) if not sitemap_failures and not incomplete else None, "failures": sitemap_failures, "complete": not sitemap_failures and not incomplete}
    # Always inspect both locale homepages and delivery entry points. Sample
    # each available route family rather than the first three products alone.
    candidates = [base + path for path in ("/", "/bn", "/delivery", "/bn/delivery")]
    safe_urls = list(dict.fromkeys(url for url in urls if same_site(url)))
    families = ("/category/", "/bn/category/", "/brand/", "/bn/brand/", "/blog/")
    missing_families = []
    for family in families:
        candidate = next((url for url in safe_urls if urllib.parse.urlsplit(url).path.startswith(family)), None)
        if candidate:
            candidates.append(candidate)
        else:
            missing_families.append(family)
    product_candidates = [x for x in urls if same_site(x) and re.search(r"/(product|products)/", urllib.parse.urlsplit(x).path)]
    for bengali in (False, True):
        localized = [url for url in product_candidates if urllib.parse.urlsplit(url).path.startswith("/bn/") == bengali]
        candidates.extend(localized[:sample_limit])
    if not product_candidates:
        report["limitations"].append("no product URLs identified in sitemap sample; product schema not assessed")
    for url in dict.fromkeys(candidates):
        page = inspect_page(url)
        report["pages"].append(page)
        report["issues"].extend(f"{url}: {i}" for i in page["issues"])
        report["warnings"].extend(f"{url}: {i}" for i in page["warnings"])
        report["limitations"].extend(f"{url}: {i}" for i in page["limitations"])
    attempted = {page["requested_url"] for page in report["pages"]}
    discovered = set(urls)
    report["coverage"] = {
        "scope": "sample", "full_site_verified": False,
        "discovered_urls": len(discovered), "attempted_pages": len(attempted),
        "fetched_pages": sum(page["http_status"] == 200 for page in report["pages"]),
        "failed_pages": sum(page["http_status"] != 200 for page in report["pages"]),
        "inspected_sitemap_urls": len(discovered & attempted),
        "skipped_sitemap_urls": len(discovered - attempted),
        "unsafe_sitemap_urls": sum(not same_site(url) for url in discovered),
        "missing_route_families": missing_families,
        "limitations": ["Bounded route sample only; uninspected URLs, indexing and deployed revision remain unverified."],
    }
    if report["checks"]["sitemap"]["url_count"] is None:
        report["limitations"].append("sitemap URL count not independently verified")
    report["status"] = "issues_found" if report["issues"] else ("incomplete" if report["limitations"] else "passed_sample")
    return report

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="seo/reports/technical/latest.json")
    parser.add_argument("--summary", default=None)
    args = parser.parse_args()
    report = run()
    dest = Path(args.output)
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    coverage = report['coverage']
    artifact = f"seo-technical-report-{os.environ.get('GITHUB_RUN_ATTEMPT', 'local')}"
    summary = f"### Lucky Store technical SEO — {report['status']}\n\n- Sitemap URLs (complete): {report['checks']['sitemap']['url_count']}\n- Sample attempted/fetched/failed: {coverage['attempted_pages']}/{coverage['fetched_pages']}/{coverage['failed_pages']}\n- Sitemap URLs inspected/skipped: {coverage['inspected_sitemap_urls']}/{coverage['skipped_sitemap_urls']}\n- Scope: bounded sample, not a full-site verdict\n- Issues: {len(report['issues'])}\n- Warnings: {len(report['warnings'])}\n- Verification limitations: {len(report['limitations'])}\n- Report: workflow artifact `{artifact}`\n"
    print(summary)
    if args.summary:
        with open(args.summary, "a", encoding="utf-8") as fh:
            fh.write(summary)
    # Do not fail a workflow for live-site findings; preserve and upload evidence first.
    return 0

if __name__ == "__main__":
    sys.exit(main())
