import type { Env } from './env';

export interface WebhookMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; mime_type?: string; caption?: string };
  audio?: { id: string; mime_type?: string };
  video?: { id: string; mime_type?: string; caption?: string };
  document?: { id: string; filename?: string; mime_type?: string; caption?: string };
  location?: { latitude: number; longitude: number; name?: string; address?: string };
  interactive?: unknown;
  button?: unknown;
}

export interface WebhookEntry {
  id: string;
  changes: Array<{
    value: {
      messaging_product: string;
      metadata: {
        display_phone_number: string;
        phone_number_id: string;
      };
      contacts?: Array<{ profile: { name: string }; wa_id: string }>;
      messages?: WebhookMessage[];
      statuses?: unknown[];
    };
    field: string;
  }>;
}

export interface WebhookPayload {
  object: string;
  entry: WebhookEntry[];
}

export async function logToSupabase(
  env: Env,
  row: {
    direction: 'incoming' | 'outgoing';
    phone_number_id?: string;
    display_phone_number?: string;
    recipient?: string;
    sender?: string;
    message_id?: string;
    message_type?: string;
    message_body?: string;
    status?: string;
    payload?: unknown;
    response?: unknown;
  }
): Promise<void> {
  const url = `${env.SUPABASE_URL}/rest/v1/whatsapp_logs`;
  const body = {
    recipient: row.recipient ?? row.display_phone_number ?? row.sender,
    ...row,
    template: row.direction === 'incoming' ? 'incoming_webhook' : 'auto_reply',
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => 'unknown error');
    console.error('Failed to log to Supabase:', response.status, text);
  }
}

export async function sendReply(
  env: Env,
  to: string,
  body: string
): Promise<{ ok: boolean; response?: unknown; status?: number }> {
  const url = `https://graph.facebook.com/v23.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { preview_url: false, body },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => ({}));
  return { ok: response.ok, response: result, status: response.status };
}
