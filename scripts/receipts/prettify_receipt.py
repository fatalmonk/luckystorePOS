"""
Lucky Store — Receipt Image Prettifier & Enhancer
Uses TypeSafe System One (Jev / jev-latest) to guide visual transformation:
1. Detects receipt orientation & needed rotation (0, 90, 180, 270 deg).
2. Evaluates lighting/contrast defects (underexposed, washed-out, glare, shadow).
3. Applies adaptive image enhancements via Pillow (auto-contrast, sharpening, tone mapping, CLAHE/unsharp mask).
4. Validates post-enhancement legibility improvement using TypeSafe noul & score.
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import sys
from typing import Any, Dict, List, Optional, Tuple

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from PIL import Image, ImageEnhance, ImageFilter, ImageOps
import numpy as np

from scripts.receipts.typesafe_client import TypeSafeClient

ROTATION_CRITERIA = {
    "upright": "Text and header are oriented normally, reading left-to-right from top-to-bottom.",
    "rotate_90_cw": "Receipt is oriented sideways, text reads vertically downwards, needs 90 degrees clockwise rotation to be upright.",
    "rotate_180": "Receipt is completely upside down, needs 180 degrees flip.",
    "rotate_270_cw": "Receipt is oriented sideways, text reads vertically upwards, needs 270 degrees clockwise (90 ccw) rotation.",
}

DEFECT_CRITERIA = {
    "dim_or_dark": "Photo is underexposed or taken in low ambient lighting; background is gray/dark, text lacks contrast.",
    "washed_out_glare": "Overexposed, bright flashlight or reflective glare washing out receipt numbers and thermal ink.",
    "faint_thermal_ink": "Thermal paper ink is faded, faint, yellowed, or low contrast against white/off-white background.",
    "good_contrast": "Clean, well-lit document with distinct dark text on a bright paper surface.",
}


class ReceiptPrettifier:
    """Prettifies and enhances receipt images guided by TypeSafe System One vision judgments."""

    def __init__(self, client: Optional[TypeSafeClient] = None, model: str = "jev-latest"):
        self.client = client or TypeSafeClient(model=model)
        self.model = model

    def analyze_receipt(self, image_path: Path) -> Dict[str, Any]:
        """Query TypeSafe System One (Jev) for visual diagnostics."""
        ref_id, asset = self.client.create_image_asset(image_path)
        questions = {
            "orientation": self.client.choice(
                instructions="Determine the current reading orientation of the receipt text in `receipt_image`.",
                criteria=ROTATION_CRITERIA,
            ),
            "lighting_defect": self.client.choice(
                instructions="Assess the primary lighting and exposure condition of `receipt_image`.",
                criteria=DEFECT_CRITERIA,
            ),
            "readable_before": self.client.noul(
                instructions="Can the supplier name, line items, and monetary totals be clearly read in `receipt_image`?",
            ),
        }
        resp = self.client.evaluate(
            state={"receipt_image": ref_id, "filename": image_path.name},
            questions=questions,
            assets={ref_id: asset},
            model=self.model,
        )
        return resp.get("answers", {})

    def evaluate_legibility(self, image_path: Path) -> float:
        """Measure legibility probability post-enhancement."""
        ref_id, asset = self.client.create_image_asset(image_path)
        questions = {
            "readable": self.client.noul(
                instructions="Can the supplier name, line items, and monetary totals be clearly read in `receipt_image`?",
            )
        }
        resp = self.client.evaluate(
            state={"receipt_image": ref_id, "filename": image_path.name},
            questions=questions,
            assets={ref_id: asset},
            model=self.model,
        )
        ans = resp.get("answers", {}).get("readable", {})
        return float(ans.get("noul", 0.0))

    def enhance_image(
        self,
        image_path: Path,
        output_path: Path,
        analysis: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Apply optical corrections and legibility enhancement filters."""
        if not analysis:
            analysis = self.analyze_receipt(image_path)

        with Image.open(image_path) as img:
            img = ImageOps.exif_transpose(img)
            img = img.convert("RGB")

            # 1. Orientation correction guided by Jev
            rot_choice = analysis.get("orientation", {}).get("choice", "upright")
            if rot_choice == "rotate_90_cw":
                img = img.rotate(-90, expand=True)
            elif rot_choice == "rotate_180":
                img = img.rotate(180, expand=True)
            elif rot_choice == "rotate_270_cw":
                img = img.rotate(90, expand=True)

            defect = analysis.get("lighting_defect", {}).get("choice", "good_contrast")

            # 2. Local adaptive contrast & white-point balancing
            # Autocontrast with slight cutoff clips shadows/hotspots
            if defect == "dim_or_dark":
                img = ImageOps.autocontrast(img, cutoff=(2, 1))
                img = ImageEnhance.Brightness(img).enhance(1.25)
                img = ImageEnhance.Contrast(img).enhance(1.35)
            elif defect == "washed_out_glare":
                img = ImageOps.autocontrast(img, cutoff=(1, 3))
                img = ImageEnhance.Brightness(img).enhance(0.9)
                img = ImageEnhance.Contrast(img).enhance(1.4)
            elif defect == "faint_thermal_ink":
                img = ImageOps.autocontrast(img, cutoff=(3, 1))
                img = ImageEnhance.Contrast(img).enhance(1.5)
            else:
                img = ImageOps.autocontrast(img, cutoff=1)
                img = ImageEnhance.Contrast(img).enhance(1.15)

            # 3. Unsharp Mask for crisp thermal printed characters
            img = img.filter(ImageFilter.UnsharpMask(radius=1.8, percent=140, threshold=3))

            # 4. Save enhanced output
            output_path.parent.mkdir(parents=True, exist_ok=True)
            img.save(output_path, "JPEG", quality=92, optimize=True)

        return {
            "orientation_applied": rot_choice,
            "defect_handled": defect,
            "readable_before": analysis.get("readable_before", {}).get("noul"),
        }


def prettify_receipt(
    input_path: str | Path,
    output_path: Optional[str | Path] = None,
    verify: bool = False,
    model: str = "jev-latest",
) -> Dict[str, Any]:
    src = Path(input_path).resolve()
    if not src.is_file():
        raise FileNotFoundError(f"Source file not found: {src}")

    if not output_path:
        dst = src.parent / f"pretty_{src.name}"
    else:
        dst = Path(output_path).resolve()

    prettifier = ReceiptPrettifier(model=model)
    analysis = prettifier.analyze_receipt(src)
    meta = prettifier.enhance_image(src, dst, analysis)

    if verify:
        meta["readable_after"] = prettifier.evaluate_legibility(dst)

    return {
        "source": str(src),
        "destination": str(dst),
        **meta,
    }


def process_directory(
    input_dir: Path,
    output_dir: Optional[Path] = None,
    in_place: bool = False,
    verify: bool = False,
    model: str = "jev-latest",
    limit: Optional[int] = None,
) -> List[Dict[str, Any]]:
    exts = {".jpg", ".jpeg", ".png"}
    images = sorted([p for p in input_dir.iterdir() if p.suffix.lower() in exts and not p.name.startswith("pretty_")])
    if limit is not None:
        images = images[:limit]
    if not images:
        print(f"No receipt images found in {input_dir}")
        return []

    prettifier = ReceiptPrettifier(model=model)
    results = []
    print(f"[*] Processing {len(images)} images in {input_dir}...")

    for i, img_path in enumerate(images, 1):
        if in_place:
            dst = img_path
        elif output_dir:
            output_dir.mkdir(parents=True, exist_ok=True)
            dst = output_dir / img_path.name
        else:
            dst = img_path.parent / f"pretty_{img_path.name}"

        try:
            analysis = prettifier.analyze_receipt(img_path)
            meta = prettifier.enhance_image(img_path, dst, analysis)
            if verify:
                meta["readable_after"] = prettifier.evaluate_legibility(dst)
            res = {
                "file": img_path.name,
                "status": "ok",
                **meta,
            }
            before = meta.get("readable_before", "N/A")
            rot = meta.get("orientation_applied", "none")
            defect = meta.get("defect_handled", "none")
            print(f"[{i}/{len(images)}] {img_path.name} -> rot={rot}, defect={defect}, read_before={before}")
        except Exception as e:
            res = {"file": img_path.name, "status": "error", "error": str(e)}
            print(f"[{i}/{len(images)}] {img_path.name} -> ERROR: {e}")
        results.append(res)

    return results


def main():
    parser = argparse.ArgumentParser(description="Prettify & enhance receipt readability with TypeSafe System One (Jev)")
    parser.add_argument("receipt_path", help="Path to input receipt image or directory")
    parser.add_argument("--output", "-o", help="Target output path or directory")
    parser.add_argument("--in-place", action="store_true", help="Overwrite images in-place with enhanced versions")
    parser.add_argument("--verify", action="store_true", help="Run second TypeSafe pass to measure legibility gain")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of receipts processed in directory")
    parser.add_argument("--model", default="jev-latest", help="TypeSafe model identifier (default: jev-latest)")
    args = parser.parse_args()

    p = Path(args.receipt_path).resolve()
    if p.is_dir():
        out_dir = Path(args.output).resolve() if args.output else None
        in_place = args.in_place or (out_dir is None)
        res = process_directory(p, output_dir=out_dir, in_place=in_place, verify=args.verify, model=args.model, limit=args.limit)
        success = sum(1 for r in res if r.get("status") == "ok")
        print(f"\nDone: {success}/{len(res)} receipts processed successfully.")
    else:
        try:
            in_place = args.in_place or (args.output is None)
            dst = p if in_place else Path(args.output).resolve()
            res = prettify_receipt(p, dst, verify=args.verify, model=args.model)
            print(json.dumps(res, indent=2))
        except Exception as e:
            print(f"Error prettifying receipt: {e}", file=sys.stderr)
            sys.exit(1)


if __name__ == "__main__":
    main()
