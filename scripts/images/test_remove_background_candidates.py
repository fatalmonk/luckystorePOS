import sys
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

sys.path.insert(0, str(Path(__file__).parent.resolve()))
from remove_background_candidates import collect_inputs, destination_for, ensure_separate_roots


class CandidatePathTests(unittest.TestCase):
    def test_single_file_input_uses_source_filename_in_output(self):
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            image = root / "tub.webp"
            image.touch()
            output = root / "review"

            self.assertEqual(collect_inputs(image), [image])
            self.assertEqual(
                destination_for(image, image, output),
                (output / "tub.transparent.png").resolve(),
            )

    def test_directory_inputs_preserve_relative_folders_and_use_png_suffix(self):
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "source"
            image = source / "polar" / "tub.webp"
            image.parent.mkdir(parents=True)
            image.touch()
            output = root / "review"

            self.assertEqual(collect_inputs(source), [image])
            self.assertEqual(
                destination_for(image, source, output),
                (output / "polar" / "tub.transparent.png").resolve(),
            )

    def test_rejects_output_inside_source_tree(self):
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "source"
            source.mkdir()
            with self.assertRaisesRegex(ValueError, "outside the source tree"):
                ensure_separate_roots(source, source / "derived")

    def test_rejects_output_that_contains_source_tree(self):
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "source"
            source.mkdir()
            with self.assertRaisesRegex(ValueError, "cannot contain"):
                ensure_separate_roots(source, root)

    def test_rejects_destination_redirected_outside_review_directory(self):
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "source"
            image = source / "polar" / "tub.webp"
            image.parent.mkdir(parents=True)
            image.touch()
            output = root / "review"
            output.mkdir()
            outside = root / "outside"
            outside.mkdir()
            (output / "polar").symlink_to(outside, target_is_directory=True)

            with self.assertRaisesRegex(ValueError, "escapes the review directory"):
                destination_for(image, source, output)


if __name__ == "__main__":
    unittest.main()
