import type { Env } from './env';
import { verifySignature } from './signature';
import { logToSupabase, sendReply, type WebhookPayload } from './whatsapp';

const GREETING = 'Thank you for saving with Lucky Store.';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // ── GET /webhook — Meta subscription verification ────────────────────────
    if (request.method === 'GET' && pathname.replace(/\/$/, '') === '/webhook') {
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      if (mode === 'subscribe' && token === env.WHATSAPP_VERIFY_TOKEN) {
        console.log('Webhook verified');
        return new Response(challenge, { status: 200 });
      }

      console.warn('Webhook verification failed', { mode, token });
      return new Response('Verification failed', { status: 403 });
    }

    // ── POST /webhook — Incoming webhook events ──────────────────────────────
    if (request.method === 'POST' && pathname.replace(/\/$/, '') === '/webhook') {
      // Optional signature verification
      if (env.META_APP_SECRET) {
        const signature = request.headers.get('X-Hub-Signature-256');
        const payload = await request.text();
        const valid = await verifySignature(payload, signature, env.META_APP_SECRET);
        if (!valid) {
          console.warn('Invalid webhook signature');
          return new Response('Invalid signature', { status: 401 });
        }
        return handleWebhookPayload(env, payload);
      }

      const payload = await request.text();
      return handleWebhookPayload(env, payload);
    }

    return new Response('Not found', { status: 404 });
  },
};

async function handleWebhookPayload(env: Env, payloadText: string): Promise<Response> {
  let payload: WebhookPayload;
  try {
    payload = JSON.parse(payloadText) as WebhookPayload;
  } catch (err) {
    console.error('Invalid JSON payload', err);
    return new Response('Invalid JSON', { status: 400 });
  }

  if (payload.object !== 'whatsapp_business_account') {
    return new Response('Ignored', { status: 200 });
  }

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const metadata = value?.metadata;
      if (!metadata) continue;

      const phoneNumberId = metadata.phone_number_id;
      const displayPhoneNumber = metadata.display_phone_number;

      // Log status updates if present
      if (value.statuses && value.statuses.length > 0) {
        await logToSupabase(env, {
          direction: 'incoming',
          phone_number_id: phoneNumberId,
          display_phone_number: displayPhoneNumber,
          message_type: 'status',
          status: 'received',
          payload: value.statuses,
        });
      }

      // Handle incoming messages and reply with a greeting
      for (const message of value.messages ?? []) {
        const from = message.from;
        const messageType = message.type;
        const messageBody = message.text?.body ?? '';

        await logToSupabase(env, {
          direction: 'incoming',
          phone_number_id: phoneNumberId,
          display_phone_number: displayPhoneNumber,
          sender: from,
          message_id: message.id,
          message_type: messageType,
          message_body: messageBody,
          status: 'received',
          payload: message,
        });

        // Only send greeting for supported incoming message types
        const supportedTypes = ['text', 'image', 'audio', 'video', 'document', 'location', 'interactive', 'button'];
        if (supportedTypes.includes(messageType)) {
          const replyResult = await sendReply(env, from, GREETING);

          await logToSupabase(env, {
            direction: 'outgoing',
            phone_number_id: phoneNumberId,
            display_phone_number: displayPhoneNumber,
            recipient: from,
            message_type: 'text',
            message_body: GREETING,
            status: replyResult.ok ? 'sent' : 'failed',
            payload: { body: GREETING },
            response: replyResult.response,
          });

          if (!replyResult.ok) {
            console.error('Auto-reply failed', replyResult.status, replyResult.response);
          }
        }
      }
    }
  }

  return new Response('OK', { status: 200 });
}
