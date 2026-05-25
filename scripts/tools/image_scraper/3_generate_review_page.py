# 3_generate_review_page.py
import csv
import json

def generate_review_html():
    with open("image_candidates.csv") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    
    # Group by SKU
    grouped = {}
    for row in rows:
        sku = row["sku"]
        if sku not in grouped:
            grouped[sku] = []
        grouped[sku].append(row)
    
    html = """<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Image Review</title>
    <style>
        body { font-family: system-ui; max-width: 1200px; margin: 0 auto; padding: 20px; }
        .product { border: 1px solid #ddd; margin: 20px 0; padding: 20px; border-radius: 8px; }
        .product h3 { margin-top: 0; color: #333; }
        .candidates { display: flex; gap: 20px; flex-wrap: wrap; }
        .candidate { border: 2px solid #eee; padding: 10px; border-radius: 6px; cursor: pointer; }
        .candidate:hover { border-color: #007bff; }
        .candidate.selected { border-color: #28a745; background: #f0fff4; }
        .candidate img { width: 150px; height: 150px; object-fit: contain; }
        .meta { font-size: 12px; color: #666; margin-top: 8px; }
        .confidence-high { color: #28a745; }
        .confidence-medium { color: #ffc107; }
        .confidence-low { color: #dc3545; }
        button { padding: 8px 16px; margin: 5px; cursor: pointer; }
        .save-btn { background: #007bff; color: white; border: none; border-radius: 4px; }
    </style>
</head>
<body>
    <h1>🔍 Image Review Dashboard</h1>
    <p>Select the correct image for each product. Click to select. Then click "Save Approved" at bottom.</p>
    <button class="save-btn" onclick="saveApproved()">💾 Save Approved Selections</button>
    <div id="products">
"""
    
    for sku, candidates in grouped.items():
        product_name = candidates[0]["product_name"]
        html += f"""
        <div class="product" data-sku="{sku}">
            <h3>{product_name} <small>({sku})</small></h3>
            <div class="candidates">
"""
        for c in candidates:
            html += f"""
                <div class="candidate" data-url="{c['candidate_image_url']}" onclick="select(this, '{sku}')">
                    <img src="{c['local_thumbnail']}" alt="{c['matched_title']}" 
                         onerror="this.src='https://via.placeholder.com/150?text=No+Image'">
                    <div class="meta">
                        <strong>Source:</strong> {c['source']}<br>
                        <strong>Matched:</strong> {c['matched_title'][:40]}<br>
                        <span class="confidence-{c['confidence']}">● {c['confidence'].upper()}</span>
                    </div>
                </div>
"""
        html += """
            </div>
        </div>
"""
    
    html += """
    </div>
    <button class="save-btn" onclick="saveApproved()">💾 Save Approved Selections</button>

    <script>
        const selections = {};
        
        function select(el, sku) {
            // Deselect others in same product
            document.querySelectorAll(`[data-sku="${sku}"] .candidate`).forEach(c => c.classList.remove('selected'));
            el.classList.add('selected');
            selections[sku] = el.dataset.url;
        }
        
        function saveApproved() {
            const data = Object.entries(selections).map(([sku, url]) => ({sku, image_url: url}));
            const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'approved_images.json';
            a.click();
            alert(`Saved ${data.length} approved images!`);
        }
    </script>
</body>
</html>
"""
    
    with open("review_dashboard.html", "w") as f:
        f.write(html)
    
    print("Generated review_dashboard.html - open it in browser")

if __name__ == "__main__":
    generate_review_html()
