#!/usr/bin/env python3
"""Read-only Lucky Store technical SEO monitor. Python standard library only."""
import argparse
import datetime as dt
import hashlib
import http.client
import json
import os
import re
import ssl
import sys
import time
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
MAX_EVIDENCE_BYTES = 12_000_000
MAX_EVIDENCE_MANIFEST_BYTES = 16_000
MIN_VISIBLE_TEXT_CHARS = 80
TRACKED_BOTS = ("GPTBot", "PerplexityBot", "ClaudeBot", "Google-Extended", "Applebot-Extended", "cohere-ai")
SECURITY_HEADER_EXPECTATIONS = {
    "x-frame-options": "SAMEORIGIN",
    "referrer-policy": "strict-origin-when-cross-origin",
    "x-content-type-options": "nosniff",
}
BUILD_SHA_HEADERS = ("x-build-sha", "x-deployment-sha", "x-vercel-git-commit-sha")
REDACTED_EVIDENCE_HEADERS = {"authorization", "proxy-authorization", "set-cookie"}


def header_items(headers):
    if not headers:
        return []
    try:
        items = headers.items()
    except AttributeError:
        items = headers
    return [(str(name), str(value)) for name, value in items]


def header_values(headers, name):
    target = name.lower()
    return [value for key, value in headers if key.lower() == target]


def header_value(headers, name):
    values = header_values(headers, name)
    return values[-1] if values else None

class RestrictedRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Reject unsafe redirect destinations before any redirected request."""
    def __init__(self):
        super().__init__()
        self.redirect_chain = []

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        self.redirect_chain.append({"status": code, "from_url": req.full_url, "to_url": newurl})
        if not same_site(newurl):
            raise UnsafeRedirectError("blocked unsafe redirect destination")
        return super().redirect_request(req, fp, code, msg, headers, newurl)

class UnsafeRedirectError(ValueError):
    """A production response attempted to redirect outside the audited site."""

def fetch(url):
    if not same_site(url):
        return {"status": None, "url": url, "error": "blocked unsafe request URL"}
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html,application/xml,text/plain,*/*"})
    redirect_handler = RestrictedRedirectHandler()
    started = time.perf_counter()
    try:
        opener = urllib.request.build_opener(
            urllib.request.HTTPSHandler(context=ssl.create_default_context()),
            redirect_handler,
        )
        with opener.open(req, timeout=TIMEOUT) as res:
            ttfb_ms = round((time.perf_counter() - started) * 1000, 1)
            if not same_site(res.geturl()):
                raise ValueError("blocked unsafe final URL")
            body = res.read(MAX_BYTES + 1)
            if len(body) > MAX_BYTES:
                raise ValueError("response exceeds 8 MB limit")
            headers = header_items(res.headers)
            return {
                "status": res.status,
                "url": res.geturl(),
                "content_type": header_value(headers, "Content-Type") or "",
                "body": body.decode("utf-8", errors="replace"),
                "body_sha256": hashlib.sha256(body).hexdigest(),
                "body_bytes": len(body),
                "response_truncated": False,
                "ttfb_ms": ttfb_ms,
                "redirect_chain": redirect_handler.redirect_chain,
                "response_headers": headers,
                "_raw_body": body,
                "etag": header_value(headers, "ETag"),
                "last_modified": header_value(headers, "Last-Modified"),
            }
    except UnsafeRedirectError as exc:
        return {"status": 0, "url": url, "redirect_chain": redirect_handler.redirect_chain, "error": str(exc)}
    except urllib.error.HTTPError as exc:
        ttfb_ms = round((time.perf_counter() - started) * 1000, 1)
        headers = header_items(exc.headers)
        response_truncated = False
        try:
            body = exc.read(MAX_BYTES + 1)
            if len(body) > MAX_BYTES:
                body = body[:MAX_BYTES]
                response_truncated = True
        except (http.client.HTTPException, OSError):
            body = b""
        return {
            "status": exc.code,
            "url": exc.geturl(),
            "content_type": header_value(headers, "Content-Type") or "",
            "body": body.decode("utf-8", errors="replace"),
            "body_sha256": hashlib.sha256(body).hexdigest(),
            "body_bytes": len(body),
            "response_truncated": response_truncated,
            "ttfb_ms": ttfb_ms,
            "redirect_chain": redirect_handler.redirect_chain,
            "response_headers": headers,
            "_raw_body": body,
            "etag": header_value(headers, "ETag"),
            "last_modified": header_value(headers, "Last-Modified"),
            "error": f"HTTP {exc.code}",
        }
    except (urllib.error.URLError, TimeoutError, ValueError, OSError, http.client.HTTPException) as exc:
        return {"status": None, "url": url, "redirect_chain": redirect_handler.redirect_chain, "error": str(exc)}

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
        self.html_lang = None
        self.head_closed = False
        self.document_closed = False
        self.metadata = {
            "canonical": {"head": [], "body": []},
            "title": {"head": [], "body": []},
            "description": {"head": [], "body": []},
            "robots": {"head": [], "body": []},
            "hreflang": {"head": [], "body": []},
        }
        self.visible_text = []
        self._section = None
        self._script = False
        self._parts = []
        self._title = False
        self._title_parts = []
        self._title_section = None
        self._hidden_depth = 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "html":
            self.html_lang = a.get("lang")
        elif tag == "head":
            self._section = "head"
        elif tag == "body":
            self._section = "body"
        if tag in {"script", "style", "template", "noscript"}:
            self._hidden_depth += 1
        if tag == "title":
            self._title = True
            self._title_parts = []
            self._title_section = self._section
        if tag == "link":
            rel = set((a.get("rel") or "").lower().split())
            if "canonical" in rel:
                self.canonicals.append(a.get("href"))
                if self._section in {"head", "body"}:
                    self.metadata["canonical"][self._section].append(a.get("href"))
            if "alternate" in rel and a.get("hreflang"):
                self.alternates.append({"lang": a.get("hreflang"), "href": a.get("href")})
                if self._section in {"head", "body"}:
                    self.metadata["hreflang"][self._section].append(a.get("hreflang"))
        if tag == "meta" and self._section in {"head", "body"}:
            name = (a.get("name") or "").lower()
            if name in {"description", "robots"}:
                self.metadata[name][self._section].append(a.get("content"))
        if tag == "script" and (a.get("type") or "").lower() == "application/ld+json":
            self._script = True
            self._parts = []

    def handle_data(self, data):
        if self._script:
            self._parts.append(data)
        if self._title:
            self._title_parts.append(data)
        if self._section == "body" and self._hidden_depth == 0:
            text = " ".join(data.split())
            if text:
                self.visible_text.append(text)

    def handle_endtag(self, tag):
        if tag == "title" and self._title:
            title = " ".join("".join(self._title_parts).split())
            if self._title_section in {"head", "body"}:
                self.metadata["title"][self._title_section].append(title)
            self._title = False
            self._title_parts = []
            self._title_section = None
        if tag == "script" and self._script:
            raw = "".join(self._parts).strip()
            try:
                self.jsonld.append({"valid": True, "data": json.loads(raw)})
            except (ValueError, TypeError):
                self.jsonld.append({"valid": False, "error": "invalid JSON"})
            self._script = False
            self._parts = []
        if tag in {"script", "style", "template", "noscript"} and self._hidden_depth:
            self._hidden_depth -= 1
        if tag == "head":
            self.head_closed = True
            self._section = None
        elif tag == "body":
            self._section = None
        elif tag == "html":
            self.document_closed = True


def split_link_header(value):
    parts = []
    start = 0
    quoted = False
    angle = False
    for index, char in enumerate(value):
        if char == '"' and not angle:
            quoted = not quoted
        elif char == "<" and not quoted:
            angle = True
        elif char == ">" and not quoted:
            angle = False
        elif char == "," and not quoted and not angle:
            parts.append(value[start:index].strip())
            start = index + 1
    parts.append(value[start:].strip())
    return [part for part in parts if part]


def canonical_link_analysis(headers, base_url):
    urls = []
    malformed = 0
    for value in header_values(headers, "Link"):
        for part in split_link_header(value):
            target = re.match(r"\s*<([^>]+)>", part)
            relation = re.search(r"(?:^|;)\s*rel\s*=\s*(?:\"([^\"]*)\"|'([^']*)'|([^;\s,]+))", part, re.IGNORECASE)
            if not target or not relation:
                continue
            rels = set(next(group for group in relation.groups() if group is not None).lower().split())
            if "canonical" in rels:
                try:
                    urls.append(urllib.parse.urljoin(base_url, target.group(1)))
                except (TypeError, ValueError):
                    malformed += 1
    return urls, malformed


def canonical_link_urls(headers, base_url):
    return canonical_link_analysis(headers, base_url)[0]


def normalized_url(url, base_url):
    if not url or not str(url).strip():
        return None
    try:
        absolute = urllib.parse.urljoin(base_url, str(url).strip())
        clean = urllib.parse.urldefrag(absolute)[0]
        return clean.rstrip("/") or clean
    except (TypeError, ValueError):
        return None


def path_locale(path):
    return "bn" if path == "/bn" or path.startswith("/bn/") else "en"


def route_family(path):
    parts = [part for part in path.split("/") if part]
    if parts and parts[0] == "bn":
        parts = parts[1:]
    if not parts:
        return "home"
    if parts[0] in {"product", "products"}:
        return "product"
    if parts[0] in {"category", "brand", "blog", "delivery"}:
        return parts[0]
    return "other"


def build_sha(headers):
    for name in BUILD_SHA_HEADERS:
        value = header_value(headers, name)
        if value and re.fullmatch(r"[0-9a-fA-F]{7,64}", value.strip()):
            return value.strip().lower()
    return None


class EvidenceCollector:
    """Write a capped raw-response sample without persisting cookie values."""
    def __init__(self, directory, max_bytes=MAX_EVIDENCE_BYTES):
        self.directory = Path(directory)
        self.directory.mkdir(parents=True, exist_ok=True)
        self.max_bytes = max(0, int(max_bytes))
        self.manifest_budget = min(MAX_EVIDENCE_MANIFEST_BYTES, self.max_bytes)
        self.response_budget = self.max_bytes - self.manifest_budget
        self.saved_bytes = 0
        self.budget_exhausted = False
        self.redacted_header_names = set()
        self.sampled_urls = []

    def _write_bounded(self, filename, data):
        remaining = max(0, self.response_budget - self.saved_bytes)
        saved = data[:remaining]
        truncated = len(saved) < len(data)
        if truncated:
            self.budget_exhausted = True
        if not saved:
            return None, 0, truncated
        (self.directory / filename).write_bytes(saved)
        self.saved_bytes += len(saved)
        return filename, len(saved), truncated

    def capture(self, requested_url, response):
        index = len(self.sampled_urls)
        stem = f"{index:02d}-{hashlib.sha256(requested_url.encode('utf-8')).hexdigest()[:12]}"
        lines = [
            f"Requested-URL: {requested_url}",
            f"Final-URL: {response.get('url')}",
            f"HTTP-Status: {response.get('status')}",
            f"TTFB-Ms: {response.get('ttfb_ms')}",
            "Redirect-Chain: " + json.dumps(response.get("redirect_chain") or [], ensure_ascii=False),
            "",
        ]
        for name, value in response.get("response_headers", []):
            safe_name = str(name).replace("\r", " ").replace("\n", " ")
            if safe_name.lower() in REDACTED_EVIDENCE_HEADERS:
                self.redacted_header_names.add(safe_name.lower())
                lines.append(f"{safe_name}: [REDACTED]")
            else:
                safe_value = str(value).replace("\r", " ").replace("\n", " ")
                lines.append(f"{safe_name}: {safe_value}")
        header_data = ("\n".join(lines) + "\n").encode("utf-8")
        headers_file, headers_saved, headers_truncated = self._write_bounded(f"{stem}.headers.txt", header_data)
        raw_body = response.get("_raw_body")
        if not isinstance(raw_body, bytes):
            raw_body = str(response.get("body") or "").encode("utf-8")
        body_file, body_saved, body_truncated = self._write_bounded(f"{stem}.body.html", raw_body)
        entry = {
            "requested_url": requested_url,
            "final_url": response.get("url"),
            "http_status": response.get("status"),
            "body_sha256": response.get("body_sha256"),
            "body_bytes": response.get("body_bytes"),
            "response_truncated": response.get("response_truncated", False),
            "headers_file": headers_file,
            "headers_saved_bytes": headers_saved,
            "headers_truncated": headers_truncated,
            "body_file": body_file,
            "body_saved_bytes": body_saved,
            "body_truncated": body_truncated,
        }
        self.sampled_urls.append(entry)
        return {key: entry[key] for key in ("headers_file", "body_file", "headers_truncated", "body_truncated")}

    def finalize(self):
        manifest = {
            "schema_version": 1,
            "scope": "bounded_raw_get_page_sample",
            "budget_bytes": self.max_bytes,
            "response_saved_bytes": self.saved_bytes,
            "manifest_bytes": 0,
            "saved_bytes": self.saved_bytes,
            "budget_exhausted": self.budget_exhausted,
            "redacted_header_names": sorted(self.redacted_header_names),
            "sampled_urls": self.sampled_urls,
        }
        for _ in range(5):
            data = (json.dumps(manifest, indent=2, ensure_ascii=False) + "\n").encode("utf-8")
            manifest_bytes = len(data)
            saved_bytes = self.saved_bytes + manifest_bytes
            if manifest["manifest_bytes"] == manifest_bytes and manifest["saved_bytes"] == saved_bytes:
                break
            manifest["manifest_bytes"] = manifest_bytes
            manifest["saved_bytes"] = saved_bytes
        data = (json.dumps(manifest, indent=2, ensure_ascii=False) + "\n").encode("utf-8")
        if len(data) > self.manifest_budget or self.saved_bytes + len(data) > self.max_bytes:
            raise ValueError("evidence manifest exceeds reserved budget")
        (self.directory / "sampled-urls.json").write_bytes(data)
        return manifest

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

def inspect_page(url, sitemap_eligible=False, evidence_collector=None):
    res = fetch(url)
    headers = res.get("response_headers", [])
    requested_path = urllib.parse.urlsplit(url).path
    final_path = urllib.parse.urlsplit(res["url"]).path
    deployed_sha = build_sha(headers)
    out = {"requested_url": url, "final_url": res["url"], "http_status": res["status"], "issues": [], "warnings": [], "limitations": [],
           "response_evidence": {k: res.get(k) for k in ("body_sha256", "body_bytes", "response_truncated", "ttfb_ms", "redirect_chain", "etag", "last_modified")},
           "route_identity": {
               "requested_path": requested_path,
               "final_path": final_path,
               "requested_locale": path_locale(requested_path),
               "final_locale": path_locale(final_path),
               "route_family": route_family(final_path),
               "sitemap_eligible": sitemap_eligible,
               "build_sha": deployed_sha,
           }}
    if evidence_collector is not None:
        out["response_evidence"]["artifact_files"] = evidence_collector.capture(url, res)
    if res["status"] == 0:
        out["issues"].append("redirected_off_site")
        out["error"] = res.get("error")
        return out
    if res["status"] is None:
        out["limitations"].append("page_unreachable_from_audit_runner; production defect unconfirmed")
        out["error"] = res.get("error")
        return out
    if res["status"] == 429:
        out["limitations"].append("rate_limited_429")
        out["error"] = res.get("error")
        return out
    if res["status"] == 206:
        out["limitations"].append("partial_content_206")
        return out
    if res["status"] != 200:
        if 300 <= res["status"] < 400:
            out["issues"].append("unresolved_http_redirect")
        elif 400 <= res["status"] < 500:
            out["issues"].append("page_http_4xx")
        elif 500 <= res["status"] < 600:
            out["issues"].append("page_http_5xx")
        else:
            out["issues"].append("page_non_success_status")
        out["error"] = res.get("error")
        return out
    if not same_site(res["url"]):
        out["issues"].append("redirected_off_site")
        return out
    redirects = res.get("redirect_chain") or []
    if redirects and out["route_identity"]["requested_locale"] != out["route_identity"]["final_locale"]:
        out["issues"].append("redirect_changed_locale")
    if redirects and sitemap_eligible:
        out["issues"].append("sitemap_url_redirects")
    if "html" not in res.get("content_type", "").lower():
        out["warnings"].append("unexpected_content_type")
    security_header_values = {
        name: header_values(headers, name)
        for name in SECURITY_HEADER_EXPECTATIONS
    }
    security_headers = {
        name: values[-1] if values else None
        for name, values in security_header_values.items()
    }
    out["security_headers"] = security_headers
    out["security_header_values"] = security_header_values
    if "response_headers" in res:
        for name, expected in SECURITY_HEADER_EXPECTATIONS.items():
            values = security_header_values[name]
            if len(values) > 1:
                out["issues"].append(f"security_header_{name.replace('-', '_')}_duplicate_or_conflicting")
            if not values or any(value.lower() != expected.lower() for value in values):
                out["issues"].append(f"security_header_{name.replace('-', '_')}_missing_or_unexpected")
    p = PageParser()
    p.feed(res["body"])
    p.close()
    placement = {
        "head_closed": p.head_closed,
        **{name: {section: len(values) for section, values in locations.items()}
           for name, locations in p.metadata.items()},
    }
    out["metadata_placement"] = placement
    out["document_closed"] = p.document_closed
    out["canonical_urls"] = p.canonicals
    out["canonical_header_urls"], malformed_header_canonicals = canonical_link_analysis(headers, res["url"])
    if malformed_header_canonicals:
        out["issues"].append("canonical_header_malformed")
    out["hreflang"] = p.alternates
    out["html_lang"] = p.html_lang
    out["title"] = p.metadata["title"]["head"]
    out["meta_descriptions"] = p.metadata["description"]["head"]
    out["robots_directives"] = p.metadata["robots"]["head"]
    out["x_robots_tag"] = header_values(headers, "X-Robots-Tag")
    out["visible_text_characters"] = len(" ".join(p.visible_text))
    out["jsonld_blocks"] = len(p.jsonld)
    out["jsonld_types"] = sorted(set().union(*(schema_types(x["data"]) for x in p.jsonld if x["valid"])))
    if not p.head_closed:
        out["limitations"].append("partial_html_response; metadata placement unverified")
        return out
    if not p.document_closed:
        out["limitations"].append("partial_html_response; document not closed")
        return out
    for name in ("canonical", "title", "description", "robots", "hreflang"):
        if p.metadata[name]["body"]:
            out["issues"].append(f"{name}_in_body")
    if len(p.canonicals) != 1:
        out["issues"].append("expected_exactly_one_canonical")
    else:
        href = p.canonicals[0]
        canonical = normalized_url(href, res["url"])
        if canonical is None and href and str(href).strip():
            out["issues"].append("canonical_malformed")
        elif canonical is None:
            out["issues"].append("canonical_missing_href")
        elif not same_site(canonical):
            out["issues"].append("canonical_off_site_or_not_https")
        elif canonical != normalized_url(res["url"], res["url"]):
            if sitemap_eligible:
                out["issues"].append("sitemap_url_canonical_mismatch")
            else:
                out["warnings"].append("canonical_differs_from_final_url_check_intent")
    tag_canonicals = {normalized_url(value, res["url"]) for value in p.canonicals if normalized_url(value, res["url"])}
    header_canonicals = {normalized_url(value, res["url"]) for value in out["canonical_header_urls"] if normalized_url(value, res["url"])}
    if header_canonicals and header_canonicals != tag_canonicals:
        out["issues"].append("canonical_header_tag_mismatch")
    if len(p.metadata["title"]["head"]) != 1 or not p.metadata["title"]["head"][0].strip():
        out["issues"].append("expected_exactly_one_title_in_head")
    descriptions = p.metadata["description"]["head"]
    if len(descriptions) != 1 or not (descriptions[0] or "").strip():
        out["issues"].append("expected_exactly_one_description_in_head")
    expected_locale = out["route_identity"]["final_locale"]
    actual_locale = (p.html_lang or "").lower().split("-", 1)[0]
    if not actual_locale:
        out["issues"].append("html_lang_missing")
    elif actual_locale != expected_locale:
        out["issues"].append("html_lang_mismatch")
    if out["visible_text_characters"] < MIN_VISIBLE_TEXT_CHARS:
        out["issues"].append("insufficient_visible_content")
    robots_tokens = {
        token
        for directive in [*p.metadata["robots"]["head"], *out["x_robots_tag"]]
        if directive
        for token in re.split(r"[\s,]+", directive.lower())
        if token
    }
    if sitemap_eligible and ({"noindex", "none"} & robots_tokens):
        out["issues"].append("sitemap_url_noindex")
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

def run(base=BASE, sample_limit=3, evidence_dir=None, evidence_max_bytes=MAX_EVIDENCE_BYTES):
    now = dt.datetime.now(dt.timezone.utc).isoformat()
    report = {"schema_version": 2, "checked_at_utc": now, "base_url": base, "status": "completed", "checks": {}, "pages": [], "issues": [], "warnings": [], "limitations": [],
              "provenance": {"monitor_version": MONITOR_VERSION, "monitor_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                             "repository": os.environ.get("GITHUB_REPOSITORY"), "run_id": os.environ.get("GITHUB_RUN_ID"),
                             "run_attempt": os.environ.get("GITHUB_RUN_ATTEMPT"), "checkout_commit": os.environ.get("GITHUB_SHA"),
                             "deployed_commit": "unverified"}}
    evidence_collector = EvidenceCollector(evidence_dir, evidence_max_bytes) if evidence_dir else None
    robots = fetch(base + "/robots.txt")
    if robots["status"] == 200:
        report["checks"]["robots"] = {"http_status": 200, **robots_summary(robots["body"])}
    else:
        report["checks"]["robots"] = {"http_status": robots["status"], "error": robots.get("error")}
        report["limitations" if robots["status"] in (None, 429) else "issues"].append("robots_unavailable")
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
            unverified = res["status"] in (None, 429)
            sitemap_failures.append({"url": url, "http_status": res["status"], "classification": "unverified" if unverified else "issue", "error": res.get("error", "non_200")})
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
    discovered = set(urls)
    for url in dict.fromkeys(candidates):
        page = inspect_page(url, sitemap_eligible=url in discovered, evidence_collector=evidence_collector)
        report["pages"].append(page)
        report["issues"].extend(f"{url}: {i}" for i in page["issues"])
        report["warnings"].extend(f"{url}: {i}" for i in page["warnings"])
        report["limitations"].extend(f"{url}: {i}" for i in page["limitations"])
    attempted = {page["requested_url"] for page in report["pages"]}
    unsafe_sitemap_urls = sum(not same_site(url) for url in discovered)
    if unsafe_sitemap_urls:
        report["issues"].append("off_site_sitemap_urls")
    report["coverage"] = {
        "scope": "sample", "full_site_verified": False,
        "discovered_urls": len(discovered), "attempted_pages": len(attempted),
        "fetched_pages": sum(page["http_status"] == 200 for page in report["pages"]),
        "failed_pages": sum(page["http_status"] != 200 for page in report["pages"]),
        "inspected_sitemap_urls": len(discovered & attempted),
        "skipped_sitemap_urls": len(discovered - attempted),
        "unsafe_sitemap_urls": unsafe_sitemap_urls,
        "missing_route_families": missing_families,
        "sampled_urls": [page["requested_url"] for page in report["pages"]],
        "limitations": ["Bounded route sample only; uninspected URLs, indexing and deployed revision remain unverified."],
    }
    if evidence_collector is not None:
        evidence_collector.finalize()
    if report["checks"]["sitemap"]["url_count"] is None:
        report["limitations"].append("sitemap URL count not independently verified")
    report["status"] = "incomplete" if report["limitations"] else ("issues_found" if report["issues"] else "passed_sample")
    return report

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="seo/reports/technical/latest.json")
    parser.add_argument("--summary", default=None)
    parser.add_argument("--evidence-dir", default=None)
    args = parser.parse_args()
    report = run(evidence_dir=args.evidence_dir)
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
