# Checkout Skill

## Description
Submit a grocery order with cart items, customer details, and delivery information.

## Endpoint
`POST https://lucky-store-six.vercel.app/api/checkout`

## Request Body
```json
{
  "items": [
    { "id": "product-uuid", "qty": 2 }
  ],
  "customerName": "John Doe",
  "customerPhone": "+8801XXXXXXXX",
  "customerAddress": "123 Main St, Chittagong",
  "notes": "Optional delivery notes",
  "deliverySlot": "morning"
}
```

## Notes
- Prices are verified server-side from the database — client-sent prices are ignored
- Free delivery on orders over ৳500
- Rate limit: 5 orders/minute per IP

## Response
```json
{
  "ok": true,
  "order": {
    "orderNumber": "LSO-20260623-ABCD1234",
    "subtotal": 340,
    "deliveryFee": 40,
    "total": 380
  }
}
```

## Authentication
- Public (no auth required for guest checkout)
- Rate limited to 5 requests/minute