import csv
import io
import json
import sys
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import scrape_product_images_playwright as scraper


class RankWithJevTests(unittest.TestCase):
    candidates = [
        {"title": "Acme Olive Oil 1L", "img": "https://example.test/wrong.jpg"},
        {"title": "Acme Olive Oil 1L Premium", "img": "https://example.test/correct.jpg"},
    ]

    def rank(self, reply, candidates=None, installed=True):
        with patch.object(scraper.os.path, "isfile", return_value=installed), patch.object(
            scraper.subprocess, "run", return_value=SimpleNamespace(returncode=0, stdout=json.dumps(reply))
        ):
            return scraper.rank_with_jev("Acme Olive Oil 1L", candidates or self.candidates)

    def reply(self, **overrides):
        result = {
            "status": "ok",
            "decision": "answer",
            "sufficient": True,
            "screening": "jev+local",
            "selected_ids": ["1"],
            "scores": {"1": {"relevance": 0.92, "injection": 0.01}},
            "dropped_injection_ids": [],
            "unjudged_ids": [],
            "local_screen_ids": [],
        }
        result.update(overrides)
        return result

    def test_uses_selected_candidate_not_first_title_match(self):
        self.assertEqual(self.rank(self.reply()), self.candidates[1]["img"])

    def test_rejects_thin_evidence_even_with_selected_id(self):
        self.assertIsNone(self.rank(self.reply(decision="propose_queries", sufficient=False)))

    def test_rejects_low_relevance(self):
        self.assertIsNone(self.rank(self.reply(scores={"1": {"relevance": 0.49}})))

    def test_rejects_unjudged_or_screened_candidate(self):
        self.assertIsNone(self.rank(self.reply(unjudged_ids=["1"])))
        self.assertIsNone(self.rank(self.reply(local_screen_ids=["1"])))

    def test_rejects_invalid_id_and_failure(self):
        self.assertIsNone(self.rank(self.reply(selected_ids=["99"])))
        self.assertIsNone(self.rank(self.reply(status="fail_open")))

    def test_missing_jev_does_not_guess_first_candidate(self):
        self.assertIsNone(self.rank(self.reply(), installed=False))
        self.assertIsNone(self.rank(self.reply(), candidates=self.candidates[:1], installed=False))


class CandidateStagingTests(unittest.TestCase):
    def test_existing_image_is_not_overwritten_and_new_image_needs_visual_review(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "catalog"
            output.mkdir()
            existing = output / "SKU.jpg"
            existing.write_bytes(b"original")
            with patch.object(scraper, "session") as session:
                self.assertFalse(scraper.stage_candidate_image("https://example.test/new.jpg", existing))
                session.get.assert_not_called()
            self.assertEqual(existing.read_bytes(), b"original")

            image = io.BytesIO()
            Image.new("RGB", (600, 600), "white").save(image, format="PNG")
            with patch.object(scraper, "session") as session:
                session.get.return_value.content = image.getvalue()
                staged = scraper.stage_candidate_image("https://example.test/new.jpg", output / "NEW.jpg")
            self.assertEqual(staged, output / "review" / "NEW.jpg")
            self.assertFalse((output / "NEW.jpg").exists())
            with Image.open(output / "review" / "NEW.jpg") as candidate:
                self.assertEqual(candidate.size, (600, 600))

    def test_csv_skips_existing_and_records_pending_visual_review(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            feed = root / "feed.csv"
            with feed.open("w", newline="", encoding="utf-8") as file:
                writer = csv.DictWriter(file, fieldnames=["id", "title", "image_link"])
                writer.writeheader()
                writer.writerow({"id": "old", "title": "Old", "image_link": ""})
                writer.writerow({"id": "new", "title": "New", "image_link": ""})
            output = root / "catalog"
            output.mkdir()
            (output / "old.jpg").write_bytes(b"original")
            image = io.BytesIO()
            Image.new("RGB", (600, 600), "white").save(image, format="PNG")

            with patch.object(sys, "argv", ["scraper", "--csv", str(feed), "--output-dir", str(output)]), \
                 patch.object(scraper, "PlaywrightImageScraper") as browser, \
                 patch.object(scraper, "session") as session, \
                 patch.object(scraper.time, "sleep"), redirect_stdout(io.StringIO()):
                browser.return_value.find_best_image.return_value = "https://example.test/new.jpg"
                session.get.return_value.content = image.getvalue()
                scraper.main()
                browser.return_value.find_best_image.assert_called_once_with("New")

            self.assertEqual((output / "old.jpg").read_bytes(), b"original")
            self.assertFalse((output / "new.jpg").exists())
            self.assertTrue((output / "review" / "new.jpg").exists())
            lines = (output / "review" / "candidates.jsonl").read_text().splitlines()
            self.assertEqual(len(lines), 1)
            self.assertEqual(json.loads(lines[0])["status"], "pending_visual_review")

    def test_single_query_refuses_to_replace_existing_image(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "existing.jpg"
            output.write_bytes(b"original")
            with patch.object(sys, "argv", ["scraper", "--query", "Acme", "--output", str(output)]), \
                 patch.object(scraper, "PlaywrightImageScraper") as browser, \
                 redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
                with self.assertRaises(SystemExit) as error:
                    scraper.main()
                self.assertEqual(error.exception.code, 2)
                browser.return_value.find_best_image.assert_not_called()
            self.assertEqual(output.read_bytes(), b"original")

    def test_single_query_stages_in_review_not_catalog(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "candidate.jpg"
            image = io.BytesIO()
            Image.new("RGB", (600, 600), "white").save(image, format="PNG")
            with patch.object(sys, "argv", ["scraper", "--query", "Acme", "--output", str(output)]), \
                 patch.object(scraper, "PlaywrightImageScraper") as browser, \
                 patch.object(scraper, "session") as session, redirect_stdout(io.StringIO()):
                browser.return_value.find_best_image.return_value = "https://example.test/candidate.jpg"
                session.get.return_value.content = image.getvalue()
                scraper.main()
            self.assertFalse(output.exists())
            self.assertTrue((output.parent / "review" / output.name).exists())


if __name__ == "__main__":
    unittest.main()
