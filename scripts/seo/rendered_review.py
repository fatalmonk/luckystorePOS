"""Check local production HTML against SEO invariants; fixture data is not live proof."""
import argparse
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import subprocess
import urllib.request

SITE = "https://www.luckystore1947.com"


def normalize(text):
    return " ".join(text.split()).casefold()


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links, self.robots, self.structured, self.text = [], [], [], []
        self.script = None
        self.hidden = False
        self.ancestors = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        invisible = ('hidden' in attrs or attrs.get('aria-hidden', '').lower() == 'true'
                     or bool(re.search(r'(?:display\s*:\s*none|visibility\s*:\s*hidden)', attrs.get('style', ''), re.I)))
        if tag not in ('area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'):
            self.ancestors.append((tag, invisible))
        if tag == "link":
            self.links.append(attrs)
        if tag == "meta" and attrs.get("name", "").lower() in ("robots", "googlebot"):
            self.robots.append(attrs.get("content", ""))
        if tag in ("script", "style"):
            self.hidden = True
            self.script = [] if attrs.get("type") == "application/ld+json" else None

    def handle_data(self, data):
        if self.script is not None:
            self.script.append(data)
        elif not self.hidden and not any(hidden for _, hidden in self.ancestors):
            self.text.append(data)

    def handle_endtag(self, tag):
        for i in range(len(self.ancestors) - 1, -1, -1):
            if self.ancestors[i][0] == tag:
                del self.ancestors[i:]
                break
        if tag in ("script", "style"):
            if self.script is not None:
                self.structured.append(json.loads("".join(self.script)))
            self.script = None
            self.hidden = False


def faq_nodes(value):
    if isinstance(value, list):
        for child in value:
            yield from faq_nodes(child)
    elif isinstance(value, dict):
        types = value.get("@type", [])
        if types == "FAQPage" or isinstance(types, list) and "FAQPage" in types:
            yield value
        for child in value.values():
            yield from faq_nodes(child)


def check_html(path, html, headers):
    page = Page()
    page.feed(html)
    canonical = [t.get("href", "").rstrip("/") for t in page.links if t.get("rel") == "canonical"]
    if canonical != [(SITE + path).rstrip("/")]:
        raise ValueError(f"{path}: missing, duplicate or incorrect canonical")
    robots = [*page.robots, headers.get("X-Robots-Tag", "")]
    if any(re.search(r"\b(noindex|none)\b", r, re.I) for r in robots):
        raise ValueError(f"{path}: unexpected noindex")
    if path in ("/", "/bn"):
        languages = [(t.get("hreflang"), t.get("href", "").rstrip("/")) for t in page.links if t.get("rel") == "alternate" and t.get("hreflang")]
        expected = [("en-BD", SITE), ("bn-BD", SITE + "/bn"), ("x-default", SITE)]
        if sorted(languages) != sorted(expected):
            raise ValueError(f"{path}: homepage hreflang set is not reciprocal")
    visible = normalize(" ".join(page.text))
    for faq in faq_nodes(page.structured):
        for item in faq.get("mainEntity", []):
            for text in (item.get("name", ""), item.get("acceptedAnswer", {}).get("text", "")):
                snippet = Page()
                snippet.feed(text)
                plain = normalize(" ".join(snippet.text))
                if not plain or plain not in visible:
                    raise ValueError(f"{path}: FAQ structured data lacks matching page text")


def routes(base):
    paths = subprocess.check_output(["git", "diff", "--name-only", base]).decode().splitlines()
    targets, limitations = {"/", "/bn", "/delivery"}, []
    for path in paths:
        if not path.startswith("apps/customer_storefront/app/") or not path.endswith("/page.tsx"):
            continue
        parts = path.removeprefix("apps/customer_storefront/app/").split("/")[:-1]
        parts = [p for p in parts if not p.startswith("(")]
        if any("[" in p for p in parts):
            limitations.append(f"Dynamic route {path}: representative parameter not verified")
        else:
            targets.add("/" + "/".join(parts))
    return sorted(targets), limitations


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", required=True)
    parser.add_argument("--url", default="http://127.0.0.1:3000")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    from notfair_snapshot import NoRedirect
    opener = urllib.request.build_opener(NoRedirect)
    targets, limitations = routes(args.base)
    checked, errors = [], []
    for path in targets:
        try:
            req = urllib.request.Request(args.url + path, headers={"User-Agent": "Googlebot"})
            with opener.open(req, timeout=30) as response:
                check_html(path, response.read().decode(), response.headers)
            checked.append(path)
        except Exception as exc:
            reason = str(exc) if type(exc) is ValueError else type(exc).__name__
            errors.append(f"{path}: {reason}")
    report = {"checked": checked, "errors": errors, "limitations": [*limitations, "Local production build with catalog fixtures and a NotFair snapshot; production/indexing unverified."]}
    Path(args.output).write_text(json.dumps(report, indent=2))
    print(f"Rendered SEO checks: {len(checked)} passed, {len(errors)} failed; {len(limitations)} dynamic routes unverified")
    for error in errors:
        print(error)
    raise SystemExit(bool(errors))
