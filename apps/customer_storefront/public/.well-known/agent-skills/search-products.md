# Search Products Skill

## Description
Search products by name, category, or price range in the Lucky Store catalog.

## Endpoints
- **Search:** `GET https://luckystore1947.com/search?q={query}`
- **Category filter:** `GET https://luckystore1947.com/category/{slug}?q={query}`

## Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| q | string | Yes | Search query (min 1 char) |
| sort | string | No | `best`, `price-low`, `price-high` (default: `best`) |
| theme | string | No | UI theme variant |

## Response
Returns HTML page with product grid. For structured data, use the browse-products skill with a query parameter.

## Authentication
- Public read access (no auth required)