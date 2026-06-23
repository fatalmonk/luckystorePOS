# Search Products Skill

## Description
Search products by name, category, or price range in the Lucky Store catalog.

## Endpoints
- **Search:** `GET https://lucky-store-six.vercel.app/search?q={query}`
- **Category filter:** `GET https://lucky-store-six.vercel.app/category/{slug}?q={query}`

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