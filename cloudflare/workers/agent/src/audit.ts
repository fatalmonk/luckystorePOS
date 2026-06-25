// src/audit.ts
// Audit logging per Phase 7

export function auditLog(
  event: 'auth_fail' | 'role_fail' | 'rate_limit' | 'proxy_ok' | 'proxy_fail',
  ctx: { requestId: string; ip: string; path: string; reason?: string }
) {
  console.warn(JSON.stringify({ event, ts: new Date().toISOString(), ...ctx }));
}