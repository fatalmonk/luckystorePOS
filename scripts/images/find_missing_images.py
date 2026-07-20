#!/usr/bin/env python3
"""
Find inventory products missing images in Lucky Store database.
Queries Supabase and outputs a list of products needing image uploads.
"""

import os
import json
from supabase import create_client, Client

# Load environment variables
SUPABASE_URL = "https://hvmyxyccfnkrbxqbhlnm.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_KEY:
    print("ERROR: SUPABASE_KEY environment variable not set")
    print("Please run: export SUPABASE_KEY='your-service-role-key'")
    exit(1)

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_products_missing_images(store_id: str = "4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd"):
    """
    Fetch all active products for the store that are missing images.
    Returns list of products with id, name, sku, category info.
    """
    try:
        # Query items table for products without image_url
        response = supabase.table("items").select("""
            id,
            name,
            sku,
            barcode,
            category_id,
            price,
            cost,
            mrp,
            is_active
        """).eq("is_active", True).eq("store_id", store_id).filter("image_url", "is", None).execute()
        
        products_without_images = response.data
        
        # Also get products with null/empty image_url
        response2 = supabase.table("items").select("""
            id,
            name,
            sku,
            barcode,
            category_id,
            price,
            cost,
            mrp,
            is_active
        """).eq("is_active", True).eq("store_id", store_id).eq("image_url", "").execute()
        
        # Combine and deduplicate
        all_ids = {p["id"] for p in products_without_images}
        for p in response2.data:
            if p["id"] not in all_ids:
                products_without_images.append(p)
        
        return products_without_images
        
    except Exception as e:
        print(f"Error querying database: {e}")
        return []

def get_categories():
    """Fetch all categories for reference."""
    try:
        response = supabase.table("categories").select("id, name, image_url").execute()
        return response.data
    except Exception as e:
        print(f"Error fetching categories: {e}")
        return []

def main():
    print("=" * 80)
    print("LUCKY STORE - PRODUCTS MISSING IMAGES")
    print("=" * 80)
    print()
    
    # Get products missing images
    products = get_products_missing_images()
    
    if not products:
        print("✓ All products have images!")
        return
    
    print(f"Found {len(products)} products missing images:\n")
    
    # Group by category
    categories = get_categories()
    category_map = {cat["id"]: cat["name"] for cat in categories or []}
    
    by_category = {}
    for product in products:
        cat_id = product.get("category_id")
        cat_name = category_map.get(cat_id, "Uncategorized")
        if cat_name not in by_category:
            by_category[cat_name] = []
        by_category[cat_name].append(product)
    
    # Print summary
    for category, items in sorted(by_category.items()):
        print(f"\n{category} ({len(items)} products):")
        print("-" * 60)
        for item in items[:10]:  # Show first 10 per category
            sku = item.get("sku", "N/A")
            name = item.get("name", "Unknown")
            product_id = item.get("id", "Unknown")
            print(f"  • {name} (SKU: {sku}, ID: {product_id})")
        
        if len(items) > 10:
            print(f"  ... and {len(items) - 10} more")
    
    print("\n" + "=" * 80)
    print(f"TOTAL: {len(products)} products need images")
    print("=" * 80)
    
    # Save to JSON file for reference
    output_file = "products_missing_images.json"
    with open(output_file, "w") as f:
        json.dump({
            "total_count": len(products),
            "products": products,
            "by_category": {k: len(v) for k, v in by_category.items()}
        }, f, indent=2)
    
    print(f"\nDetailed list saved to: {output_file}")
    print("\nTo upload images, use the admin_web ProductUpdateDrawer or run:")
    print("  npm run upload-images -- --product-id=<id> --image=<path>")

if __name__ == "__main__":
    main()