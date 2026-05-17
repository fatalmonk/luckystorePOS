import { spawn, spawnSync } from 'child_process';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

type Scenario =
  | 'duplicate_delivery'
  | 'reordered_delivery'
  | 'delayed_ack_replay'
  | 'concurrent_deduct_stock'
  | 'concurrent_set_inventory_stock';

type Operation = {
  scenario: Scenario;
  worker: number;
  operationId: string;
  rpc: 'deduct_stock' | 'set_stock';
  quantity?: number;
  newQuantity?: number;
  delayMs: number;
  expectedQuantity?: number;
};

type OperationResult = {
  scenario: Scenario;
  worker: number;
  operation_id: string;
  rpc: Operation['rpc'];
  status: 'applied' | 'idempotent_replay' | 'conflict' | 'error';
  attempts: number;
  retried_40001: number;
  retried_unique_violation: number;
  sqlstate: string | null;
  error_class: string | null;
  result: unknown;
};

type Validation = {
  final_stock: number;
  movement_count: number;
  distinct_operation_count: number;
  duplicate_operation_rows: number;
  negative_stock_rows: number;
  negative_stock_levels: number;
  ledger_delta_sum: number;
  expected_from_ledger: number;
  last_movement_new_quantity: number | null;
};

type StormReport = {
  status: 'VERIFIED' | 'FAILED';
  run_id: string;
  database: 'local' | 'staging';
  worker_count: number;
  operations_planned: number;
  summary: {
    applied_or_idempotent: number;
    conflicts: number;
    errors: number;
    serialization_retries: number;
    unique_violation_retries: number;
    deadlocks: number;
  };
  invariants: Record<string, 'VERIFIED' | 'FAILED'>;
  validation: Validation;
  operations: OperationResult[];
};

const DB_URL = process.env.REPLAY_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const INITIAL_STOCK = 120;
const MAX_ATTEMPTS = 6;
const OUT_PATH = path.resolve(process.cwd(), 'artifacts', 'certification', 'concurrency-storm-report.json');

function uuidFromSeed(seed: string): string {
  const hash = crypto.createHash('sha256').update(seed).digest();
  hash[6] = (hash[6] & 0x0f) | 0x40;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function sqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function redact(text: string): string {
  return text.replace(DB_URL, '[REDACTED_DB_URL]');
}

function runPsql(sql: string): { ok: boolean; stdout: string; stderr: string; status: number | null } {
  const result = spawnSync(
    'psql',
    [DB_URL, '--no-psqlrc', '--quiet', '--tuples-only', '--no-align', '--set', 'ON_ERROR_STOP=1'],
    { input: `\\set VERBOSITY verbose\n${sql}`, encoding: 'utf8', maxBuffer: 1024 * 1024 * 20 },
  );
  return {
    ok: result.status === 0,
    stdout: result.stdout || '',
    stderr: redact(result.stderr || ''),
    status: result.status,
  };
}

function runPsqlAsync(sql: string): Promise<{ ok: boolean; stdout: string; stderr: string; status: number | null }> {
  return new Promise((resolve) => {
    const child = spawn('psql', [
      DB_URL,
      '--no-psqlrc',
      '--quiet',
      '--tuples-only',
      '--no-align',
      '--set',
      'ON_ERROR_STOP=1',
    ]);
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('close', (status) => {
      resolve({ ok: status === 0, stdout, stderr: redact(stderr), status });
    });
    child.stdin.end(`\\set VERBOSITY verbose\n${sql}`);
  });
}

function parseJsonLine(stdout: string): any {
  const line = stdout.split(/\r?\n/).map((entry) => entry.trim()).find((entry) => entry.startsWith('{'));
  if (!line) return null;
  return JSON.parse(line);
}

function sqlState(stderr: string): string | null {
  return stderr.match(/ERROR:\s+([0-9A-Z]{5}):/)?.[1] || null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setupSql(ids: Record<string, string>): string {
  const runHash = crypto.createHash('md5').update(ids.run).digest('hex').toUpperCase();
  const storeCode = 'STORM-' + runHash.slice(0, 8);
  const itemSku = 'SKU-' + runHash.slice(0, 8);
  
  return `
DO $$
BEGIN
  -- Authoritative Auth Setup for Remote Staging
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'storm-local@example.invalid') THEN
    INSERT INTO auth.users (
      id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    )
    VALUES (
      gen_random_uuid(), 'authenticated', 'authenticated',
      'storm-local@example.invalid', 'not-used', now(),
      '{"role":"service_role"}'::jsonb, '{}'::jsonb, now(), now()
    );
  END IF;

  -- Create Tenant (Idempotent)
  INSERT INTO public.tenants (id, name)
  VALUES (${sqlLiteral(ids.tenant)}::uuid, 'Concurrency Storm Tenant')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

  -- Create Store (Idempotent with Unique Code)
  INSERT INTO public.stores (id, tenant_id, name, code)
  VALUES (${sqlLiteral(ids.store)}::uuid, ${sqlLiteral(ids.tenant)}::uuid, 'Concurrency Storm Store', ${sqlLiteral(storeCode)})
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code;

  -- Create Public User Linked to Auth User (Idempotent via auth_id)
  INSERT INTO public.users (id, tenant_id, store_id, auth_id, name, email, role)
  SELECT 
    ${sqlLiteral(ids.publicUser)}::uuid,
    ${sqlLiteral(ids.tenant)}::uuid,
    ${sqlLiteral(ids.store)}::uuid,
    id,
    'Concurrency Storm User',
    'storm-local@example.invalid',
    'admin'
  FROM auth.users 
  WHERE email = 'storm-local@example.invalid'
  ON CONFLICT (auth_id) DO UPDATE SET 
    tenant_id = EXCLUDED.tenant_id,
    store_id = EXCLUDED.store_id,
    name = EXCLUDED.name, 
    role = EXCLUDED.role;

  -- Create Storm Item (Idempotent with Unique SKU)
  INSERT INTO public.items (id, tenant_id, sku, name, price, cost, active)
  VALUES (${sqlLiteral(ids.item)}::uuid, ${sqlLiteral(ids.tenant)}::uuid, ${sqlLiteral(itemSku)}, 'Concurrency Storm Item', 1, 1, true)
  ON CONFLICT (id) DO UPDATE SET sku = EXCLUDED.sku, name = EXCLUDED.name;

  -- Initialize Stock Level (Forced Reset for Clean Run)
  INSERT INTO public.stock_levels (store_id, item_id, qty)
  VALUES (${sqlLiteral(ids.store)}::uuid, ${sqlLiteral(ids.item)}::uuid, ${INITIAL_STOCK})
  ON CONFLICT (store_id, item_id) DO UPDATE SET qty = ${INITIAL_STOCK};

  -- Ensure Ledger is Clear for this Store/Item to avoid interference from previous runs
  DELETE FROM public.stock_ledger WHERE store_id = ${sqlLiteral(ids.store)}::uuid AND product_id = ${sqlLiteral(ids.item)}::uuid;

END $$;
`;
}

function operationSql(op: Operation, ids: Record<string, string>): string {
  const rpcCall =
    op.rpc === 'deduct_stock'
      ? `public.deduct_stock(
          ${sqlLiteral(ids.store)}::uuid,
          ${sqlLiteral(ids.item)}::uuid,
          ${op.quantity},
          jsonb_build_object('scenario', ${sqlLiteral(op.scenario)}, 'worker', ${op.worker}),
          ${sqlLiteral(op.operationId)}::uuid,
          ${op.expectedQuantity == null ? 'NULL' : op.expectedQuantity}
        )`
      : `public.set_stock(
          ${sqlLiteral(ids.store)}::uuid,
          ${sqlLiteral(ids.item)}::uuid,
          ${op.newQuantity},
          ${sqlLiteral(op.scenario)},
          jsonb_build_object('operation_id', ${sqlLiteral(op.operationId)})::text
        )`;

  return `
BEGIN;
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = (SELECT auth_id FROM public.users WHERE email = 'storm-local@example.invalid' LIMIT 1);
SELECT json_build_object('rpc_result', ${rpcCall});
COMMIT;
`;
}

function buildOperations(ids: Record<string, string>): Operation[] {
  const operations: Operation[] = [];
  const duplicateId = uuidFromSeed(`${ids.run}:duplicate-delivery`);

  for (let worker = 0; worker < 8; worker += 1) {
    operations.push({
      scenario: 'duplicate_delivery',
      worker,
      operationId: duplicateId,
      rpc: 'deduct_stock',
      quantity: 2,
      delayMs: worker % 2 === 0 ? 0 : 12,
    });
  }

  [3, 1, 4, 0, 2].forEach((worker, index) => {
    operations.push({
      scenario: 'reordered_delivery',
      worker,
      operationId: uuidFromSeed(`${ids.run}:reordered:${worker}`),
      rpc: 'deduct_stock',
      quantity: 1,
      delayMs: index * 7,
    });
  });

  operations.push({
    scenario: 'delayed_ack_replay',
    worker: 20,
    operationId: uuidFromSeed(`${ids.run}:delayed-ack`),
    rpc: 'deduct_stock',
    quantity: 3,
    delayMs: 0,
  });
  operations.push({
    scenario: 'delayed_ack_replay',
    worker: 21,
    operationId: uuidFromSeed(`${ids.run}:delayed-ack`),
    rpc: 'deduct_stock',
    quantity: 3,
    delayMs: 120,
  });

  for (let worker = 30; worker < 48; worker += 1) {
    operations.push({
      scenario: 'concurrent_deduct_stock',
      worker,
      operationId: uuidFromSeed(`${ids.run}:deduct:${worker}`),
      rpc: 'deduct_stock',
      quantity: 2,
      delayMs: (worker % 6) * 3,
    });
  }

  [95, 88, 104, 91, 99, 86].forEach((newQuantity, index) => {
    operations.push({
      scenario: 'concurrent_set_inventory_stock',
      worker: 60 + index,
      operationId: uuidFromSeed(`${ids.run}:set:${index}`),
      rpc: 'set_stock',
      newQuantity,
      delayMs: index * 5,
    });
  });

  return operations.sort((a, b) => a.worker - b.worker || a.operationId.localeCompare(b.operationId));
}

async function executeOperation(op: Operation, ids: Record<string, string>): Promise<OperationResult> {
  let retried40001 = 0;
  let retriedUnique = 0;
  let lastState: string | null = null;
  let lastError = '';

  await sleep(op.delayMs);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const result = await runPsqlAsync(operationSql(op, ids));
    const state = sqlState(result.stderr);
    lastState = state;
    lastError = result.stderr;

    if (result.ok) {
      const parsed = parseJsonLine(result.stdout);
      const rpcResult = parsed?.rpc_result || {};
      const status =
        rpcResult?.idempotent_replay === true
          ? 'idempotent_replay'
          : rpcResult?.conflict === true
            ? 'conflict'
            : 'applied';
      return {
        scenario: op.scenario,
        worker: op.worker,
        operation_id: op.operationId,
        rpc: op.rpc,
        status,
        attempts: attempt,
        retried_40001: retried40001,
        retried_unique_violation: retriedUnique,
        sqlstate: null,
        error_class: null,
        result: rpcResult,
      };
    }

    if (state === '40001') {
      retried40001 += 1;
      await sleep(10 * attempt);
      continue;
    }

    if (state === '23505') {
      retriedUnique += 1;
      await sleep(15 * attempt);
      continue;
    }

    break;
  }

  return {
    scenario: op.scenario,
    worker: op.worker,
    operation_id: op.operationId,
    rpc: op.rpc,
    status: 'error',
    attempts: MAX_ATTEMPTS,
    retried_40001: retried40001,
    retried_unique_violation: retriedUnique,
    sqlstate: lastState,
    error_class: lastState === '40P01' ? 'deadlock' : lastState === '40001' ? 'serialization_retry_exhausted' : 'sql_error',
    result: lastError.split(/\r?\n/).slice(0, 4).join('\n'),
  };
}

function validationSql(ids: Record<string, string>): string {
  return `
WITH movement_rows AS (
  SELECT *
  FROM public.stock_ledger
  WHERE store_id = ${sqlLiteral(ids.store)}::uuid
    AND product_id = ${sqlLiteral(ids.item)}::uuid
),
stock AS (
  SELECT qty AS current_qty
  FROM public.stock_levels
  WHERE store_id = ${sqlLiteral(ids.store)}::uuid
    AND item_id = ${sqlLiteral(ids.item)}::uuid
),
dupes AS (
  SELECT movement_id
  FROM movement_rows
  WHERE movement_id IS NOT NULL
  GROUP BY movement_id
  HAVING COUNT(*) > 1
),
last_movement AS (
  SELECT new_quantity
  FROM movement_rows
  ORDER BY created_at DESC, id DESC
  LIMIT 1
)
SELECT json_build_object(
  'final_stock', (SELECT current_qty FROM stock),
  'movement_count', (SELECT COUNT(*) FROM movement_rows),
  'distinct_operation_count', (SELECT COUNT(DISTINCT movement_id) FROM movement_rows WHERE movement_id IS NOT NULL),
  'duplicate_operation_rows', (SELECT COUNT(*) FROM dupes),
  'negative_stock_rows', (SELECT COUNT(*) FROM movement_rows WHERE new_quantity < 0 OR previous_quantity < 0),
  'negative_stock_levels', (SELECT COUNT(*) FROM stock WHERE current_qty < 0),
  'ledger_delta_sum', (SELECT COALESCE(SUM(quantity_change), 0) FROM movement_rows),
  'expected_from_ledger', ${INITIAL_STOCK} + (SELECT COALESCE(SUM(quantity_change), 0) FROM movement_rows),
  'last_movement_new_quantity', (SELECT new_quantity FROM last_movement)
);
`;
}

function validate(ids: Record<string, string>): Validation {
  const result = runPsql(validationSql(ids));
  if (!result.ok) {
    throw new Error(result.stderr);
  }
  return parseJsonLine(result.stdout) as Validation;
}

function writeReport(report: StormReport) {
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, `${JSON.stringify(report, null, 2)}\n`);
}

async function main() {
  const runId = process.env.STORM_RUN_ID || `staging-${Date.now()}`;
  const ids = {
    run: runId.replace(/[^a-zA-Z0-9-]/g, '-').slice(0, 48),
    tenant: uuidFromSeed(`${runId}:tenant`),
    store: uuidFromSeed(`${runId}:store`),
    item: uuidFromSeed(`${runId}:item`),
    publicUser: uuidFromSeed(`${runId}:public-user`),
    authUser: uuidFromSeed(`${runId}:auth-user`),
  };

  const connection = runPsql('SELECT json_build_object(\'ok\', true);');
  if (!connection.ok) {
    const report: StormReport = {
      status: 'FAILED',
      run_id: ids.run,
      database: 'staging',
      worker_count: 0,
      operations_planned: 0,
      summary: {
        applied_or_idempotent: 0,
        conflicts: 0,
        errors: 1,
        serialization_retries: 0,
        unique_violation_retries: 0,
        deadlocks: 0,
      },
      invariants: {
        database_reachable: 'FAILED',
      },
      validation: {
        final_stock: 0,
        movement_count: 0,
        distinct_operation_count: 0,
        duplicate_operation_rows: 0,
        negative_stock_rows: 0,
        negative_stock_levels: 0,
        ledger_delta_sum: 0,
        expected_from_ledger: 0,
        last_movement_new_quantity: null,
      },
      operations: [],
    };
    writeReport(report);
    throw new Error(`Database is not reachable: ${connection.stderr.split(/\r?\n/).slice(0, 3).join('\n')}`);
  }

  const setup = runPsql(setupSql(ids));
  if (!setup.ok) {
    throw new Error(`Storm setup failed: ${setup.stderr}`);
  }

  const operations = buildOperations(ids);
  console.log(`[STORM] Starting Concurrency Storm [Run: ${ids.run}] against Staging...`);
  const results = await Promise.all(operations.map((op) => executeOperation(op, ids)));
  results.sort((a, b) => a.scenario.localeCompare(b.scenario) || a.worker - b.worker || a.operation_id.localeCompare(b.operation_id));
  const validation = validate(ids);

  const summary = {
    applied_or_idempotent: results.filter((result) => result.status === 'applied' || result.status === 'idempotent_replay').length,
    conflicts: results.filter((result) => result.status === 'conflict').length,
    errors: results.filter((result) => result.status === 'error').length,
    serialization_retries: results.reduce((sum, result) => sum + result.retried_40001, 0),
    unique_violation_retries: results.reduce((sum, result) => sum + result.retried_unique_violation, 0),
    deadlocks: results.filter((result) => result.sqlstate === '40P01').length,
  };

  const invariants: StormReport['invariants'] = {
    no_negative_stock: validation.negative_stock_levels === 0 && validation.negative_stock_rows === 0 ? 'VERIFIED' : 'FAILED',
    no_double_apply: validation.duplicate_operation_rows === 0 ? 'VERIFIED' : 'FAILED',
    no_lost_updates: validation.final_stock === validation.expected_from_ledger ? 'VERIFIED' : 'FAILED',
    ledger_converges_to_stock: validation.last_movement_new_quantity === validation.final_stock ? 'VERIFIED' : 'FAILED',
    no_deadlocks: summary.deadlocks === 0 ? 'VERIFIED' : 'FAILED',
    serialization_failures_retried: results.every((result) => result.sqlstate !== '40001') ? 'VERIFIED' : 'FAILED',
    operation_errors_absent: summary.errors === 0 ? 'VERIFIED' : 'FAILED',
  };

  const report: StormReport = {
    status: Object.values(invariants).every((value) => value === 'VERIFIED') ? 'VERIFIED' : 'FAILED',
    run_id: ids.run,
    database: 'staging',
    worker_count: new Set(operations.map((op) => op.worker)).size,
    operations_planned: operations.length,
    summary,
    invariants,
    validation,
    operations: results,
  };

  writeReport(report);
  console.log(JSON.stringify(report, null, 2));
  if (report.status !== 'VERIFIED') {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(redact(error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
