"""Capture bounded read-only GSC evidence; never export OAuth credentials."""
import argparse
from datetime import datetime, timedelta, timezone
import json
import math
import os
from pathlib import Path
import urllib.parse
import urllib.request
from zoneinfo import ZoneInfo


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def clean_rows(data, dimensions):
    rows = data.get("rows", [])
    if not isinstance(rows, list) or len(rows) > 1000:
        raise ValueError("Invalid rows")
    result = []
    for row in rows:
        keys = row.get("keys", [])
        if not isinstance(keys, list) or len(keys) != len(dimensions):
            raise ValueError("Invalid dimensions")
        if any(not isinstance(key, str) or len(key) > 2048 for key in keys):
            raise ValueError("Invalid key")
        item = {"keys": keys}
        for name in ("clicks", "impressions", "ctr", "position"):
            value = row.get(name)
            if isinstance(value, bool) or not isinstance(value, (int, float)):
                raise ValueError("Invalid metric")
            if not math.isfinite(value) or value < 0 or (name == "ctr" and value > 1):
                raise ValueError("Invalid metric")
            item[name] = value
        result.append(item)
    return result


def capture(now=None):
    names = ("GSC_CLIENT_ID", "GSC_CLIENT_SECRET", "GSC_REFRESH_TOKEN", "GSC_SITE_URL")
    config = {name: os.environ.get(name, "").strip() for name in names}
    if any(not value for value in config.values()):
        raise ValueError("Missing GSC configuration")
    site = config["GSC_SITE_URL"]
    if site not in ("sc-domain:luckystore1947.com", "https://www.luckystore1947.com/",
                    "https://luckystore1947.com/"):
        raise ValueError("Invalid Lucky Store property")
    opener = urllib.request.build_opener(NoRedirect)

    def request(url, body, headers):
        req = urllib.request.Request(url, data=body, headers=headers, method="POST")
        with opener.open(req, timeout=30) as response:
            raw = response.read(2_000_001)
        if len(raw) > 2_000_000:
            raise ValueError("Response exceeds limit")
        data = json.loads(raw)
        if not isinstance(data, dict):
            raise ValueError("Invalid response")
        return data

    token_data = request("https://oauth2.googleapis.com/token", urllib.parse.urlencode({
        "client_id": config["GSC_CLIENT_ID"], "client_secret": config["GSC_CLIENT_SECRET"],
        "refresh_token": config["GSC_REFRESH_TOKEN"], "grant_type": "refresh_token",
    }).encode(), {"Content-Type": "application/x-www-form-urlencoded"})
    token = token_data.get("access_token")
    if not isinstance(token, str) or not token:
        raise ValueError("Missing access token")
    now = now or datetime.now(timezone.utc)
    end = now.astimezone(ZoneInfo("America/Los_Angeles")).date() - timedelta(days=3)
    endpoint = "https://www.googleapis.com/webmasters/v3/sites/" + urllib.parse.quote(site, safe="") + "/searchAnalytics/query"
    windows = {}
    for label, last in (("current", end), ("previous", end - timedelta(days=28))):
        start = last - timedelta(days=27)
        evidence = {"start_date": start.isoformat(), "end_date": last.isoformat()}
        for kind, dimensions in (("totals", []), ("pages", ["page"]), ("queries", ["query"])):
            data = request(endpoint, json.dumps({
                "startDate": start.isoformat(), "endDate": last.isoformat(),
                "dimensions": dimensions, "type": "web", "dataState": "final", "rowLimit": 1000,
            }).encode(), {"Content-Type": "application/json", "Authorization": "Bearer " + token})
            rows = clean_rows(data, dimensions)
            if kind == "totals" and len(rows) > 1:
                raise ValueError("Invalid totals")
            evidence[kind] = {"dimensions": dimensions, "rows": rows,
                              "row_limit_reached": len(rows) == 1000}
        windows[label] = evidence
    report = {"schema_version": 1, "source": "Google Search Console Search Analytics API",
              "captured_at": now.isoformat(), "site_url": site, "search_type": "web",
              "data_state": "final", "date_timezone": "America/Los_Angeles",
              "windows": windows, "limitations": [
                  "Recent three days excluded; only finalized data requested.",
                  "Page and query tables contain up to 1000 top rows, not exhaustive coverage.",
                  "Anonymized queries and API limits can prevent row sums matching totals.",
                  "Empty rows mean no returned data, not verified zero traffic.",
                  "Search analytics does not verify indexing or conversions.",
              ]}
    serialized = json.dumps(report, allow_nan=False)
    if any(value in serialized for value in (config["GSC_CLIENT_SECRET"], config["GSC_REFRESH_TOKEN"], token)):
        raise ValueError("Credential present in report")
    return report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    output = Path(args.output)
    output.unlink(missing_ok=True)
    try:
        report = capture()
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(report, allow_nan=False) + "\n")
        print("Captured finalized GSC evidence for two 28-day windows; no credentials exported")
    except Exception as exc:
        # Never log remote bodies, credential-bearing URLs, or exception messages.
        print(f"GSC capture failed ({type(exc).__name__}); check configuration and property access")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
