#!/usr/bin/env python3
"""
Lucky Store 1947 — GBP Photo Geotagger & Metadata Injector
Injects EXIF GPS coordinates and IPTC metadata into GBP photo batches.
"""
import os
import sys
import shutil
import subprocess

COORDINATE_CLUSTERS = {
    "store": {
        "lat": 22.3550277,
        "lon": 91.8363056,
        "alt": 14,
        "desc": "Fresh grocery staples and daily bazaar at Lucky Store, 665 Percival Hill Road, Emdad Park, Chawkbazar, Chattogram.",
    },
    "panchlaish": {
        "lat": 22.3615000,
        "lon": 91.8285000,
        "alt": 12,
        "desc": "Home grocery delivery to Panchlaish and Prabartak Circle from Lucky Store Chattogram. Cash on Delivery.",
    },
    "nasirabad": {
        "lat": 22.3688000,
        "lon": 91.8214000,
        "alt": 16,
        "desc": "Prompt online grocery delivery to Nasirabad and CDA Avenue from Lucky Store Chattogram.",
    },
}

KEYWORDS = [
    "grocery delivery chattogram",
    "online grocery chittagong",
    "daily bazaar chawkbazar",
    "grocery shop near me",
    "lucky store 1947",
    "percival hill road",
    "panchlaish grocery delivery",
    "nasirabad daily bazaar",
]

def tag_image(image_path: str, cluster: str = "store", custom_caption: str = ""):
    if not os.path.exists(image_path):
        print(f"Error: File '{image_path}' does not exist.", file=sys.stderr)
        return False

    if not shutil.which("exiftool"):
        print("Warning: 'exiftool' is not installed. To install on macOS, run: brew install exiftool")
        return False

    cluster_info = COORDINATE_CLUSTERS.get(cluster.lower(), COORDINATE_CLUSTERS["store"])
    caption = custom_caption or cluster_info["desc"]

    cmd = [
        "exiftool",
        "-overwrite_original",
        f"-GPSLatitude={cluster_info['lat']}",
        "-GPSLatitudeRef=N",
        f"-GPSLongitude={cluster_info['lon']}",
        "-GPSLongitudeRef=E",
        f"-GPSAltitude={cluster_info['alt']}",
        "-GPSAltitudeRef=0",
        f"-ImageDescription={caption}",
        f"-Caption-Abstract={caption}",
        "-Artist=Lucky Store 1947",
        "-By-line=Lucky Store Dispatch",
        "-Copyright=© 2026 Lucky Store (luckystore1947.com)",
        "-City=Chattogram",
        "-Sub-location=Chawkbazar",
        "-Province-State=Chittagong Division",
        "-Country=Bangladesh",
    ]

    for kw in KEYWORDS:
        cmd.extend(["-Keywords+=", kw])

    cmd.append(image_path)

    try:
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        print(f"Successfully tagged {image_path} with {cluster} coordinates ({cluster_info['lat']}, {cluster_info['lon']}).")
        return True
    except subprocess.CalledProcessError as e:
        print(f"ExifTool error: {e.stderr.decode()}", file=sys.stderr)
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 geotag_gbp_photos.py <image_path> [store|panchlaish|nasirabad] [custom_caption]")
        sys.exit(1)
    
    img = sys.argv[1]
    clust = sys.argv[2] if len(sys.argv) > 2 else "store"
    capt = sys.argv[3] if len(sys.argv) > 3 else ""
    tag_image(img, clust, capt)
