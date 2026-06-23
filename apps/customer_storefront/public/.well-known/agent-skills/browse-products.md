# Browse Products Skill

## Description
Browse the Lucky Store product catalog with categories, search, and filtering.

## Endpoints
- **List all products:** `GET https://lucky-store-six.vercel.app/api/products`
- **List categories:** `GET https://lucky-store-six.vercel.app/api/categories`
- **Browse by category:** `GET https://lucky-store-six.vercel.app/category/{slug}`

## Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | No | Search term for product name |
| category | string | No | Category slug to filter |
| limit | number | No | Max results (default 20, max 100) |
| offset | number | No | Pagination offset (default 0) |

## Response Format
```json
{
  "products": [
    {
      "id": "uuid",
      "name": "Product Name",
      "price": 120,
      "originalPrice": 150,
      "category": "snacks",
      "emoji": "🍫",
      "unit": "pc",
      "stock": 45,
      "image_url": "https://..."
    }
  ],
  "total": 100
}
```

## Authentication
- Public read access (no auth required)
- Rate limit: 60 requests/minute