#!/usr/bin/env python3
"""Create local, review-only transparent product image derivatives.

The default invocation is a dry run. Processing requires --write and an output
directory that is separate from the source tree. This tool never uploads files.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Iterable

SUPPORTED_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".bmp"}


def collect_inputs(source: Path) -> list[Path]:
    if source.is_file():
        if source.suffix.lower() not in SUPPORTED_SUFFIXES:
            raise ValueError(f"Unsupported image extension: {source.suffix}")
        return [source]
    if not source.is_dir():
        raise ValueError(f"Input path does not exist: {source}")
    return sorted(
        path for path in source.rglob("*")
        if path.is_file() and path.suffix.lower() in SUPPORTED_SUFFIXES
    )


def destination_for(source: Path, input_root: Path, output_root: Path) -> Path:
    relative = source.relative_to(input_root) if input_root.is_dir() else Path(source.name)
    output_resolved = output_root.resolve()
    destination = (output_resolved / relative.parent / f"{relative.stem}.transparent.png").resolve()
    try:
        destination.relative_to(output_resolved)
    except ValueError as exc:
        raise ValueError("Output path escapes the review directory through a symlink") from exc
    return destination


def ensure_separate_roots(input_root: Path, output_root: Path) -> None:
    input_resolved = input_root.resolve()
    output_resolved = output_root.resolve()
    if input_resolved == output_resolved or input_resolved in output_resolved.parents:
        raise ValueError("Output directory must be outside the source tree")
    if output_resolved in input_resolved.parents:
        raise ValueError("Output directory cannot contain the source tree")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path, help="Source image or directory")
    parser.add_argument("--output-dir", required=True, type=Path, help="Separate local derivative directory")
    parser.add_argument("--model", default="u2net", help="rembg model name (default: u2net)")
    parser.add_argument("--write", action="store_true", help="Run inference and write PNG derivatives; omitted means dry run")
    return parser


def process_files(files: Iterable[Path], input_root: Path, output_root: Path, model: str) -> int:
    try:
        from rembg import new_session, remove
    except ImportError as exc:
        raise RuntimeError("Optional dependency missing. Install with: pip install -e '.[image-background-removal]'") from exc

    session = new_session(model)
    output_root.mkdir(parents=True, exist_ok=True)
    written = 0
    for source in files:
        destination = destination_for(source, input_root, output_root)
        if destination.exists():
            print(f"SKIP exists: {destination}")
            continue
        destination.parent.mkdir(parents=True, exist_ok=True)
        image_bytes = source.read_bytes()
        result = remove(image_bytes, session=session)
        # rembg returns a PNG with an alpha channel; store only to the review directory.
        with destination.open("xb") as output:
            output.write(result)
        written += 1
        print(f"WROTE: {destination}")
    return written


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    input_root = args.input.resolve()
    output_root = args.output_dir.resolve()
    try:
        ensure_separate_roots(input_root, output_root)
        files = collect_inputs(input_root)
        if not files:
            print("No supported images found.")
            return 0
        print(f"Found {len(files)} image(s); output: {output_root}")
        if not args.write:
            for source in files:
                print(f"WOULD WRITE: {destination_for(source, input_root, output_root)}")
            print("Dry run only. Add --write to create local PNG candidates.")
            return 0
        count = process_files(files, input_root, output_root, args.model)
        print(f"Created {count} transparent candidate(s). Review edges, colors, labels, and shadows before use.")
        return 0
    except (OSError, RuntimeError, ValueError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
