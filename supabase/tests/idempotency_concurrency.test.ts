import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createDbClient, runSql } from './test/setup';

const delay = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

describe('tenant-scoped idempotency concurrency', () => {
  it('allows one transaction to claim a key and rejects a concurrent claim', async () => {
    const tenantId = randomUUID();
    const idempotencyKey = `concurrent-${randomUUID()}`;
    const first = createDbClient();
    const second = createDbClient();
    let firstConnected = false;
    let secondConnected = false;
    let firstInTransaction = false;
    let secondInTransaction = false;

    try {
      await runSql('INSERT INTO public.tenants (id, name) VALUES ($1, $2)', [
        tenantId,
        `Idempotency concurrency ${tenantId}`,
      ]);

      await first.connect();
      firstConnected = true;
      await second.connect();
      secondConnected = true;

      await first.query('BEGIN');
      firstInTransaction = true;
      await first.query(`SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true)`);

      const firstClaim = await first.query(
        'SELECT public.check_idempotency($1, $2) AS response',
        [idempotencyKey, tenantId],
      );
      expect(firstClaim.rows[0].response).toBeNull();

      await second.query('BEGIN');
      secondInTransaction = true;
      await second.query(`SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true)`);

      let secondSettled = false;
      const secondClaim = second
        .query('SELECT public.check_idempotency($1, $2) AS response', [idempotencyKey, tenantId])
        .then(
          (result) => {
            secondSettled = true;
            return { result };
          },
          (error: Error) => {
            secondSettled = true;
            return { error };
          },
        );

      // ON CONFLICT may wait internally without exposing a stable pg_stat_activity
      // wait_event_type. Assert observable behavior instead: while the first
      // claim is uncommitted, the competing call cannot finish.
      await delay(250);
      expect(secondSettled).toBe(false);

      await first.query('COMMIT');
      firstInTransaction = false;

      const outcome = await secondClaim;
      expect('error' in outcome).toBe(true);
      if ('error' in outcome) {
        expect(outcome.error.message).toContain('idempotency key conflict: concurrent request in progress');
      }

      await second.query('ROLLBACK');
      secondInTransaction = false;
    } finally {
      if (firstConnected && firstInTransaction) await first.query('ROLLBACK');
      if (secondConnected && secondInTransaction) await second.query('ROLLBACK');
      if (firstConnected) await first.end();
      if (secondConnected) await second.end();
      await runSql('DELETE FROM public.idempotency_keys WHERE tenant_id = $1 AND idempotency_key = $2', [
        tenantId,
        idempotencyKey,
      ]);
      await runSql('DELETE FROM public.tenants WHERE id = $1', [tenantId]);
    }
  });
});
