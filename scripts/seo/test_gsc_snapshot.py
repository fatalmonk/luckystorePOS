import contextlib
from datetime import datetime, timezone
import io
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
import urllib.error
from unittest.mock import MagicMock, patch

import gsc_snapshot as gsc


CONFIG = {"GSC_CLIENT_ID": "fake-client", "GSC_CLIENT_SECRET": "fake-secret",
          "GSC_REFRESH_TOKEN": "fake-refresh", "GSC_SITE_URL": "sc-domain:luckystore1947.com"}


class SnapshotTests(unittest.TestCase):
    def test_http_errors_identify_stage_without_exporting_remote_text(self):
        cases = [(400, b'{"error":"invalid_grant","error_description":"fake-secret"}', "OAuth token exchange", "Refresh token"),
                 (401, b'{"error":"invalid_client"}', "OAuth token exchange", "GSC_CLIENT_SECRET"),
                 (403, b'{"error":{"message":"fake-secret"}}', "Search Analytics query", "property access")]
        for status, body, stage, hint in cases:
            with self.subTest(stage=stage, status=status):
                opener = MagicMock()
                error = urllib.error.HTTPError("https://example.invalid/fake-secret", status, "fake-secret", {}, io.BytesIO(body))
                if stage == "OAuth token exchange":
                    opener.open.side_effect = error
                else:
                    response = MagicMock()
                    response.__enter__.return_value.read.return_value = b'{"access_token":"fake-access"}'
                    opener.open.side_effect = [response, error]
                with patch.dict(os.environ, CONFIG, clear=True), patch("urllib.request.build_opener", return_value=opener):
                    with self.assertRaises(gsc.GoogleRequestError) as caught:
                        gsc.capture()
                text = caught.exception.diagnostic
                self.assertIn(stage, text)
                self.assertIn(str(status), text)
                self.assertIn(hint, text)
                self.assertNotIn("fake-secret", text)

    def test_capture_dates_requests_and_credentials(self):
        requests = []

        def respond(req, timeout):
            requests.append(req)
            if req.full_url.endswith("/token"):
                data = {"access_token": "fake-access"}
            else:
                dimensions = json.loads(req.data)["dimensions"]
                data = {"rows": [{"keys": ["example"] if dimensions else [],
                                  "clicks": 2, "impressions": 20, "ctr": .1, "position": 12}]}
            response = MagicMock()
            response.__enter__.return_value.read.return_value = json.dumps(data).encode()
            return response

        opener = MagicMock()
        opener.open.side_effect = respond
        with patch.dict(os.environ, CONFIG, clear=True), patch("urllib.request.build_opener", return_value=opener):
            report = gsc.capture(datetime(2026, 10, 14, 12, tzinfo=timezone.utc))
        self.assertEqual(len(requests), 7)
        self.assertEqual(report["windows"]["current"]["start_date"], "2026-09-14")
        self.assertEqual(report["windows"]["current"]["end_date"], "2026-10-11")
        self.assertEqual(report["windows"]["previous"]["end_date"], "2026-09-13")
        for secret in ("fake-secret", "fake-refresh", "fake-access"):
            self.assertNotIn(secret, json.dumps(report))
        for req in requests[1:]:
            self.assertIn("sc-domain%3Aluckystore1947.com", req.full_url)
            self.assertEqual(json.loads(req.data)["dataState"], "final")
            self.assertEqual(json.loads(req.data)["rowLimit"], 1000)

    def test_empty_data_is_not_fabricated(self):
        self.assertEqual(gsc.clean_rows({}, []), [])

    def test_invalid_metrics_rejected(self):
        for value in (float("nan"), float("inf"), True, -1, "2"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                gsc.clean_rows({"rows": [{"keys": [], "clicks": value,
                                         "impressions": 20, "ctr": .1, "position": 12}]}, [])

    def test_configuration_required_and_property_restricted(self):
        for config in ({}, {**CONFIG, "GSC_SITE_URL": "https://other.example/"}):
            with patch.dict(os.environ, config, clear=True), self.assertRaises(ValueError):
                gsc.capture()

    def test_redirects_cannot_forward_credentials(self):
        self.assertIsNone(gsc.NoRedirect().redirect_request(None, None, None, None, None, None))

    def test_failures_remove_stale_evidence_and_redact_messages(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "report.json"
            output.write_text("stale")
            log = io.StringIO()
            with patch.object(sys, "argv", ["gsc", "--output", str(output)]), \
                    patch.object(gsc, "capture", side_effect=RuntimeError("fake-secret")), \
                    contextlib.redirect_stdout(log):
                self.assertEqual(gsc.main(), 1)
            self.assertFalse(output.exists())
            self.assertNotIn("fake-secret", log.getvalue())


if __name__ == "__main__":
    unittest.main()
