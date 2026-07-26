import type { Env } from './env';

const REPORT_TIME_ZONE = 'Asia/Dhaka';
const REPORT_TEMPLATE = 'daily_sales_summary';
const GRAPH_API_VERSION = 'v25.0';

interface DailySalesSummary {
  transaction_count: number;
  gross_sales: number;
  discounts: number;
  returns: number;
  net_sales: number;
  cash_total: number;
  digital_total: number;
  pending_postings: number;
  failed_postings: number;
}

interface MetaMessageResponse {
  messages?: Array<{ id?: string; message_status?: string }>;
  error?: { message?: string };
}

function localReportDate(timestamp: number): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: REPORT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(timestamp));
}

function completedReportDate(timestamp: number): string {
  return localReportDate(timestamp - 24 * 60 * 60 * 1000);
}

function reportWindow(reportDate: string): {
  startAt: string;
  endAt: string;
} {
  const start = new Date(`${reportDate}T00:00:00+06:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { startAt: start.toISOString(), endAt: end.toISOString() };
}

function displayDate(reportDate: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: REPORT_TIME_ZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${reportDate}T12:00:00+06:00`));
}

function displayTimestamp(timestamp: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: REPORT_TIME_ZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(timestamp));
}

function count(value: unknown): string {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)).toString() : '0';
}

function money(value: unknown): string {
  const number = Number(value);
  const safe = Number.isFinite(number) ? number : 0;
  return `৳${safe.toLocaleString('en-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function supabaseHeaders(env: Env): HeadersInit {
  return {
    'Content-Type': 'application/json',
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  };
}

async function reserveReport(
  env: Env,
  reportDate: string
): Promise<string | null> {
  const response = await fetch(
    `${env.SUPABASE_URL}/rest/v1/rpc/claim_service_daily_sales_summary`,
    {
      method: 'POST',
      headers: supabaseHeaders(env),
      body: JSON.stringify({
        p_report_date: reportDate,
        p_recipient: env.DAILY_SUMMARY_RECIPIENT.replace(/\D/g, ''),
        p_phone_number_id: env.WHATSAPP_PHONE_NUMBER_ID,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Report reservation failed with status ${response.status}`);
  }

  return (await response.json()) as string | null;
}

async function finalizeReservation(
  env: Env,
  reservationId: string,
  status: 'sent' | 'failed',
  reportDate: string,
  summary: DailySalesSummary,
  responsePayload: MetaMessageResponse,
  messageId?: string
): Promise<void> {
  const query = new URLSearchParams({ id: `eq.${reservationId}` });
  const response = await fetch(
    `${env.SUPABASE_URL}/rest/v1/whatsapp_logs?${query.toString()}`,
    {
      method: 'PATCH',
      headers: {
        ...supabaseHeaders(env),
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        status,
        message_id: messageId ?? null,
        payload: { report_date: reportDate, summary },
        response: responsePayload,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Report finalization failed with status ${response.status}`);
  }
}

async function fetchSummary(
  env: Env,
  startAt: string,
  endAt: string
): Promise<DailySalesSummary> {
  const response = await fetch(
    `${env.SUPABASE_URL}/rest/v1/rpc/get_service_daily_sales_summary`,
    {
      method: 'POST',
      headers: supabaseHeaders(env),
      body: JSON.stringify({
        p_start_at: startAt,
        p_end_at: endAt,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Summary RPC failed with status ${response.status}`);
  }

  return (await response.json()) as DailySalesSummary;
}

function textParameter(parameterName: string, text: string): object {
  return {
    type: 'text',
    parameter_name: parameterName,
    text,
  };
}

async function sendTemplate(
  env: Env,
  reportDate: string,
  scheduledTime: number,
  summary: DailySalesSummary
): Promise<{ ok: boolean; status: number; response: MetaMessageResponse }> {
  const url =
    `https://graph.facebook.com/${GRAPH_API_VERSION}/` +
    `${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const parameters = [
    textParameter('report_date', displayDate(reportDate)),
    textParameter('transaction_count', count(summary.transaction_count)),
    textParameter('gross_sales', money(summary.gross_sales)),
    textParameter('discounts', money(summary.discounts)),
    textParameter('returns', money(summary.returns)),
    textParameter('net_sales', money(summary.net_sales)),
    textParameter('cash_total', money(summary.cash_total)),
    textParameter('digital_total', money(summary.digital_total)),
    textParameter('pending_postings', count(summary.pending_postings)),
    textParameter('failed_postings', count(summary.failed_postings)),
    textParameter('generated_at', `${displayTimestamp(scheduledTime)} Asia/Dhaka`),
  ];
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: env.DAILY_SUMMARY_RECIPIENT.replace(/\D/g, ''),
      type: 'template',
      template: {
        name: REPORT_TEMPLATE,
        language: { code: 'en_US' },
        components: [{ type: 'body', parameters }],
      },
    }),
  });

  const result = (await response.json().catch(() => ({}))) as MetaMessageResponse;
  return { ok: response.ok, status: response.status, response: result };
}

export async function sendDailySalesSummary(
  env: Env,
  scheduledTime: number
): Promise<void> {
  const reportDate = completedReportDate(scheduledTime);
  const reservationId = await reserveReport(env, reportDate);

  if (!reservationId) {
    console.log('Daily sales summary already claimed', { reportDate });
    return;
  }

  const { startAt, endAt } = reportWindow(reportDate);
  const summary = await fetchSummary(env, startAt, endAt);
  const result = await sendTemplate(env, reportDate, scheduledTime, summary);
  const messageId = result.response.messages?.[0]?.id;

  await finalizeReservation(
    env,
    reservationId,
    result.ok ? 'sent' : 'failed',
    reportDate,
    summary,
    result.response,
    messageId
  );

  if (!result.ok) {
    throw new Error(
      `WhatsApp template send failed with status ${result.status}: ` +
        `${result.response.error?.message ?? 'unknown error'}`
    );
  }

  console.log('Daily sales summary sent', {
    reportDate,
    messageId,
    messageStatus: result.response.messages?.[0]?.message_status,
  });
}
