import csv
import json

def auto_approve():
    with open("image_candidates.csv", "r") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    
    # Group by SKU
    grouped = {}
    for row in rows:
        sku = row["sku"]
        if sku not in grouped:
            grouped[sku] = []
        grouped[sku].append(row)
    
    approved = []
    
    for sku, candidates in grouped.items():
        # Try high confidence first
        high = [c for c in candidates if c["confidence"] == "high"]
        if high:
            approved.append({"sku": sku, "image_url": high[0]["candidate_image_url"]})
            continue
            
        # Fallback to medium
        medium = [c for c in candidates if c["confidence"] == "medium"]
        if medium:
            approved.append({"sku": sku, "image_url": medium[0]["candidate_image_url"]})
            continue
            
        # Ignore low confidence as requested by user
        print(f"Skipping {sku} - only low confidence candidates found.")
        
    with open("approved_images.json", "w") as f:
        json.dump(approved, f, indent=2)
        
    print(f"Auto-approved {len(approved)} images.")

if __name__ == "__main__":
    auto_approve()
