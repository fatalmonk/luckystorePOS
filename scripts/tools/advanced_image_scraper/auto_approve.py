import json
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

def main():
    cand_file = Path("scraper_output/candidates.json")
    if not cand_file.exists():
        log.error("candidates.json not found")
        return
        
    with open(cand_file) as f:
        candidates = json.load(f)
        
    # Group by SKU
    grouped = {}
    for c in candidates:
        sku = c["sku"]
        if sku not in grouped:
            grouped[sku] = []
        grouped[sku].append(c)
        
    approved = []
    
    for sku, cands in grouped.items():
        # Pick the best scoring HIGH or MED candidate
        valid_cands = [c for c in cands if c["confidence"] in ("HIGH", "MED")]
        if not valid_cands:
            log.warning(f"Skipping {sku} - no HIGH/MED candidates")
            continue
            
        best = sorted(valid_cands, key=lambda x: x["score"], reverse=True)[0]
        approved.append(best)
        log.info(f"Approved {sku} with score {best['score']} ({best['confidence']})")
        
    out_file = Path("scraper_output/approved_images.json")
    with open(out_file, "w") as f:
        json.dump(approved, f, indent=2)
        
    log.info(f"Auto-approved {len(approved)} items.")

if __name__ == "__main__":
    main()
