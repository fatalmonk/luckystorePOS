# Track Order Skill

## Description
Track the status of a placed order by order number.

## Endpoint
`GET https://luckystore1947.com/order/{orderNumber}`

## Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| orderNumber | string | Yes | Order number (format: LSO-YYYYMMDD-XXXXXXXX) |

## Response
Returns HTML order status page with delivery progress.

## Authentication
- Public (order number serves as access token)
- No rate limit (read-only)