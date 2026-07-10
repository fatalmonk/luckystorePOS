# Lucky Store WhatsApp Webhook Worker

Cloudflare Worker that receives WhatsApp Business Platform webhooks, logs them to Supabase, and auto-replies to customer messages with a greeting.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/webhook` | Meta webhook subscription verification (`hub.verify_token`) |
| POST | `/webhook` | Receive webhook events, log to Supabase, send greeting |

## Required secrets

Set these with `npx wrangler secret put <NAME>`:

- `WHATSAPP_PHONE_NUMBER_ID` — `1133667033174167`
- `WHATSAPP_ACCESS_TOKEN` — Meta system-user token with `whatsapp_business_messaging` scope
- `WHATSAPP_VERIFY_TOKEN` — generate a random string, also paste into Meta dashboard
- `SUPABASE_URL` — `https://hvmyxyccfnkrbxqbhlnm.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service-role key
- `META_APP_SECRET` — Facebook app secret (optional, enables webhook signature verification)

## Deployment

```bash
cd cloudflare/workers/whatsapp-webhook
npm install
npx wrangler deploy
```

## Meta dashboard setup

1. Go to App Dashboard → WhatsApp → Configuration.
2. Webhook URL: `https://whatsapp.luckystore1947.com/webhook`
3. Verify token: the value you set in `WHATSAPP_VERIFY_TOKEN`.
4. Subscribe to the **messages** field.
5. Ensure DNS for `whatsapp.luckystore1947.com` points to Cloudflare.

## Auto-reply behavior

Any supported incoming message triggers:

```
Thank you for saving with Lucky Store.
```

Both the incoming message and the outgoing reply are logged to `public.whatsapp_logs`.
