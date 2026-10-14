"""Capture published NotFair content on a trusted runner; never export credentials."""
import argparse
import json
import os
from pathlib import Path
import re
import urllib.parse
import urllib.request


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def capture():
    key = os.environ.get("NOTFAIR_SEO_API_KEY")
    if not key:
        raise ValueError("Missing NOTFAIR_SEO_API_KEY")
    opener = urllib.request.build_opener(NoRedirect)

    def fetch(slug=None):
        url = "https://notfair.co/api/seo/content"
        if slug is not None:
            url += "?" + urllib.parse.urlencode({"slug": slug})
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {key}"})
        with opener.open(req, timeout=30) as response:
            raw = response.read(4_000_001)
        if len(raw) > 4_000_000:
            raise ValueError("NotFair content exceeds snapshot limit")
        data = json.loads(raw)
        if key in json.dumps(data):
            raise ValueError("Credential unexpectedly present in content")
        return data

    fields = ("id", "title", "slug", "meta_description", "tags", "image_url",
              "reading_time_minutes", "published_at", "created_at")
    index = fetch()
    posts = index.get("posts")
    if not isinstance(posts, list) or len(posts) > 100:
        raise ValueError("Invalid or oversized NotFair index")
    details = {}
    for post in posts:
        slug = post.get("slug", "")
        if not isinstance(slug, str) or not re.fullmatch(r"[a-zA-Z0-9_-]{1,200}", slug):
            raise ValueError("Invalid NotFair slug")
        detail = fetch(slug).get("post")
        if not isinstance(detail, dict) or detail.get("slug") != slug:
            raise ValueError("NotFair detail does not match index")
        details[slug] = {field: detail[field] for field in (*fields, "content_html")}
    return {"posts": [{field: post[field] for field in fields} for post in posts], "details": details}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    try:
        content = capture()
        Path(args.output).write_text(json.dumps(content))
        print(f"Captured {len(content['posts'])} published NotFair posts; no credentials exported")
    except Exception as exc:
        # Remote response bodies and exception URLs must never enter logs.
        print(f"NotFair snapshot failed ({type(exc).__name__})")
        raise SystemExit(1)
