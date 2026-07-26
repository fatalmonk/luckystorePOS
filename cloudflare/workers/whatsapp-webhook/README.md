# Lucky Store WhatsApp Webhook Worker

Cloudflare Worker that receives WhatsApp Business Platform webhooks, logs them
to Supabase, auto-replies to customer messages, and sends the approved internal
daily sales summary.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/webhook` | Meta webhook subscription verification (`hub.verify_token`) |
| POST | `/webhook` | Receive webhook events, log to Supabase, send greeting |

## Required secrets

Set these with `npx wrangler secret put <NAME>`:

- `WHATSAPP_PHONE_NUMBER_ID` — `1142670135604389`
- `WHATSAPP_ACCESS_TOKEN` — Meta system-user token with `whatsapp_business_messaging` scope
- `WHATSAPP_VERIFY_TOKEN` — generate a random string, also paste into Meta dashboard
- `SUPABASE_URL` — `https://hvmyxyccfnkrbxqbhlnm.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service-role key
- `META_APP_SECRET` — Facebook app secret; webhook signatures are required
- `DAILY_SUMMARY_RECIPIENT` — recipient in international digits-only format

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

## Daily sales summary

The production Cron Trigger is temporarily disabled until the Lucky Store
WhatsApp business number is verified and registered. When re-enabled, schedule
it for `18:05 UTC` (`00:05 Asia/Dhaka`) so it reports the previous completed
Dhaka calendar day.

The Worker sends the approved `daily_sales_summary` utility template, calls the
service-role-only `get_service_daily_sales_summary` RPC, and sends aggregate
metrics only. A service-only atomic claim prevents duplicate sends for the same
report date; failed or abandoned pre-send claims can be retried safely.
