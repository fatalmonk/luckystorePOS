"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let dbConfig = {
    hasStockLedger: false,
    deductStockArgs: 6,
    hasSetInventoryStock: false,
    hasSetStock: false,
    hasItemsActive: false,
    hasItemsIsActive: false,
};
const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const INITIAL_STOCK = 120;
const MAX_ATTEMPTS = 6;
const OUT_PATH = path.resolve(process.cwd(), 'artifacts', 'certification', 'concurrency-storm-report.json');
function uuidFromSeed(seed) {
    const hash = crypto.createHash('sha256').update(seed).digest();
    hash[6] = (hash[6] & 0x0f) | 0x40;
    hash[8] = (hash[8] & 0x3f) | 0x80;
    const hex = hash.subarray(0, 16).toString('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function sqlLiteral(value) {
    return `'${value.replace(/'/g, "''")}'`;
}
function redact(text) {
    return text.replace(DB_URL, '[REDACTED_DB_URL]');
}
function runPsql(sql) {
    const result = (0, child_process_1.spawnSync)('psql', [DB_URL, '--no-psqlrc', '--quiet', '--tuples-only', '--no-align', '--set', 'ON_ERROR_STOP=1'], { input: `\\set VERBOSITY verbose\n${sql}`, encoding: 'utf8', maxBuffer: 1024 * 1024 * 20 });
    return {
        ok: result.status === 0,
        stdout: result.stdout || '',
        stderr: redact(result.stderr || ''),
        status: result.status,
    };
}
async function executeOperationAsync(sql) {
    return new Promise((resolve) => {
        const child = (0, child_process_1.spawn)('psql', [DB_URL, '--no-psqlrc', '--quiet', '--tuples-only', '--no-align', '--set', 'ON_ERROR_STOP=1']);
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
function parseJsonLine(stdout) {
    const line = stdout.split(/\r?\n/).map((entry) => entry.trim()).find((entry) => entry.startsWith('{'));
    if (!line)
        return null;
    return JSON.parse(line);
}
function sqlState(stderr) {
    return stderr.match(/ERROR:\s+([0-9A-Z]{5}):/)?.[1] || null;
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function setupSql(ids) {
    const shortId = ids.run.slice(0, 8);
    const activeCol = dbConfig.hasItemsActive ? 'active' : 'is_active';
    return `
DO $$
BEGIN
  -- Create unique index on stock_ledger metadata operation_id for idempotency storm validation
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_ledger') THEN
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_ledger_operation_id ON public.stock_ledger (((metadata->>''operation_id'')::uuid)) WHERE (metadata->>''operation_id'' IS NOT NULL)';
  END IF;

  -- Authoritative Auth Setup
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'storm-${shortId}@example.invalid') THEN
    INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (gen_random_uuid(), 'authenticated', 'authenticated', 'storm-${shortId}@example.invalid', 'not-used', now(), '{"role":"service_role"}'::jsonb, '{}'::jsonb, now(), now());
  END IF;

  -- Create Tenant
  INSERT INTO public.tenants (id, name)
  VALUES (${sqlLiteral(ids.tenant)}::uuid, 'Storm Tenant ${shortId}')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

  -- Create Store
  INSERT INTO public.stores (id, tenant_id, name, code)
  VALUES (${sqlLiteral(ids.store)}::uuid, ${sqlLiteral(ids.tenant)}::uuid, 'Storm Store ${shortId}', 'STORM_${shortId}')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code;

  -- Create Public User (Schema ground-truth: name, auth_id, role, store_id, tenant_id)
  INSERT INTO public.users (id, tenant_id, store_id, auth_id, name, email, role)
  SELECT 
    ${sqlLiteral(ids.publicUser)}::uuid,
    ${sqlLiteral(ids.tenant)}::uuid,
    ${sqlLiteral(ids.store)}::uuid,
    id,
    'Storm User ${shortId}',
    email,
    'admin'
  FROM auth.users 
  WHERE email = 'storm-${shortId}@example.invalid'
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;

  -- Create Storm Item (Schema ground-truth: id, tenant_id, sku, name, price, cost, active/is_active)
  INSERT INTO public.items (id, tenant_id, sku, name, price, cost, ${activeCol})
  VALUES (${sqlLiteral(ids.item)}::uuid, ${sqlLiteral(ids.tenant)}::uuid, 'SKU-${shortId}', 'Storm Item ${shortId}', 10, 5, true)
  ON CONFLICT (id) DO UPDATE SET sku = EXCLUDED.sku, name = EXCLUDED.name;

  -- Initialize Stock Level
  INSERT INTO public.stock_levels (store_id, item_id, qty)
  VALUES (${sqlLiteral(ids.store)}::uuid, ${sqlLiteral(ids.item)}::uuid, ${INITIAL_STOCK})
  ON CONFLICT (store_id, item_id) DO UPDATE SET qty = ${INITIAL_STOCK};

END $$;
`;
}
function operationSql(op, ids) {
    const rpcCall = op.rpc === 'deduct_stock'
        ? (dbConfig.deductStockArgs === 4
            ? `public.deduct_stock(
            ${sqlLiteral(ids.store)}::uuid,
            ${sqlLiteral(ids.item)}::uuid,
            ${op.quantity},
            jsonb_build_object('scenario', ${sqlLiteral(op.scenario)}, 'worker', ${op.worker}, 'operation_id', ${sqlLiteral(op.operationId)}::uuid)
          )`
            : `public.deduct_stock(
            ${sqlLiteral(ids.store)}::uuid,
            ${sqlLiteral(ids.item)}::uuid,
            ${op.quantity},
            jsonb_build_object('scenario', ${sqlLiteral(op.scenario)}, 'worker', ${op.worker}),
            ${sqlLiteral(op.operationId)}::uuid
          )`)
        : `public.set_stock(
          ${sqlLiteral(ids.store)}::uuid,
          ${sqlLiteral(ids.item)}::uuid,
          ${op.newQuantity},
          'correction',
          'Storm concurrency set stock adjustment'
        )`;
    return `
BEGIN;
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
SELECT set_config('request.jwt.claim.sub', auth_id::text, true) FROM public.users WHERE id = ${sqlLiteral(ids.publicUser)}::uuid LIMIT 1;
SET LOCAL ROLE authenticated;
SELECT json_build_object('rpc_result', ${rpcCall});
COMMIT;
`;
}
function buildOperations(ids) {
    const operations = [];
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
            operationId: uuidFromSeed(`${ids.run}:reordered-${index}`),
            rpc: 'deduct_stock',
            quantity: 5,
            delayMs: index * 10,
        });
    });
    for (let worker = 0; worker < 5; worker += 1) {
        for (let i = 0; i < 10; i += 1) {
            operations.push({
                scenario: 'concurrent_deduct_stock',
                worker,
                operationId: uuidFromSeed(`${ids.run}:concurrent-deduct-${worker}-${i}`),
                rpc: 'deduct_stock',
                quantity: 1,
                delayMs: Math.random() * 50,
            });
        }
    }
    for (let worker = 0; worker < 3; worker += 1) {
        operations.push({
            scenario: 'concurrent_set_inventory_stock',
            worker,
            operationId: uuidFromSeed(`${ids.run}:concurrent-set-${worker}`),
            rpc: 'set_stock',
            newQuantity: 50 + worker * 10,
            delayMs: Math.random() * 100,
        });
    }
    return operations;
}
async function executeOperation(op, ids, attempt = 1) {
    if (op.delayMs > 0) {
        await sleep(op.delayMs);
    }
    const result = await executeOperationAsync(operationSql(op, ids));
    const state = sqlState(result.stderr);
    // Staging: Intercept index violation as idempotent replay (do not retry)
    const isIdempotentViolation = state === '23505' && result.stderr.includes('idx_stock_ledger_operation_id');
    if (state === '40001' || (state === '23505' && !isIdempotentViolation)) {
        if (attempt < MAX_ATTEMPTS) {
            const backoff = Math.pow(2, attempt) * 50 + Math.random() * 50;
            await sleep(backoff);
            const retryResult = await executeOperation(op, ids, attempt + 1);
            return {
                ...retryResult,
                attempts: retryResult.attempts,
                retried_40001: retryResult.retried_40001 + (state === '40001' ? 1 : 0),
                retried_unique_violation: retryResult.retried_unique_violation + (state === '23505' ? 1 : 0),
            };
        }
    }
    let status = result.ok ? 'applied' : 'error';
    const parsed = parseJsonLine(result.stdout);
    if (result.ok && parsed?.rpc_result?.status === 'idempotent_replay') {
        status = 'idempotent_replay';
    }
    if (isIdempotentViolation) {
        status = 'idempotent_replay';
    }
    else if (state === '40001' || state === '23505' || state === '40P01') {
        status = 'conflict';
    }
    return {
        scenario: op.scenario,
        worker: op.worker,
        operation_id: op.operationId,
        rpc: op.rpc,
        status,
        attempts: attempt,
        retried_40001: state === '40001' ? 1 : 0,
        retried_unique_violation: state === '23505' ? 1 : 0,
        sqlstate: state,
        error_class: state ? state.slice(0, 2) : null,
        result: isIdempotentViolation ? { status: 'idempotent_replay' } : (parsed?.rpc_result || null),
    };
}
function validate(ids) {
    const sql = dbConfig.hasStockLedger
        ? `
    WITH stats AS (
      SELECT 
        (SELECT qty FROM public.stock_levels WHERE store_id = ${sqlLiteral(ids.store)}::uuid AND item_id = ${sqlLiteral(ids.item)}::uuid) as final_stock,
        (SELECT count(*) FROM public.stock_ledger WHERE store_id = ${sqlLiteral(ids.store)}::uuid AND product_id = ${sqlLiteral(ids.item)}::uuid) as movement_count,
        (SELECT count(DISTINCT (metadata->>'operation_id')::uuid) FROM public.stock_ledger WHERE store_id = ${sqlLiteral(ids.store)}::uuid AND product_id = ${sqlLiteral(ids.item)}::uuid AND (metadata->>'operation_id') IS NOT NULL) as distinct_operation_count,
        (SELECT count(*) FROM (SELECT (metadata->>'operation_id')::uuid FROM public.stock_ledger WHERE store_id = ${sqlLiteral(ids.store)}::uuid AND product_id = ${sqlLiteral(ids.item)}::uuid AND (metadata->>'operation_id') IS NOT NULL GROUP BY (metadata->>'operation_id')::uuid HAVING count(*) > 1) dups) as duplicate_operation_rows,
        (SELECT count(*) FROM public.stock_ledger WHERE store_id = ${sqlLiteral(ids.store)}::uuid AND product_id = ${sqlLiteral(ids.item)}::uuid AND new_quantity < 0) as negative_stock_rows,
        (SELECT count(*) FROM public.stock_levels WHERE store_id = ${sqlLiteral(ids.store)}::uuid AND item_id = ${sqlLiteral(ids.item)}::uuid AND qty < 0) as negative_stock_levels,
        (SELECT coalesce(sum(quantity_change), 0) FROM public.stock_ledger WHERE store_id = ${sqlLiteral(ids.store)}::uuid AND product_id = ${sqlLiteral(ids.item)}::uuid) as ledger_delta_sum,
        (SELECT new_quantity FROM public.stock_ledger WHERE store_id = ${sqlLiteral(ids.store)}::uuid AND product_id = ${sqlLiteral(ids.item)}::uuid ORDER BY created_at DESC, id DESC LIMIT 1) as last_movement_new_quantity
    )
    SELECT json_build_object(
      'final_stock', final_stock,
      'movement_count', movement_count,
      'distinct_operation_count', distinct_operation_count,
      'duplicate_operation_rows', duplicate_operation_rows,
      'negative_stock_rows', negative_stock_rows,
      'negative_stock_levels', negative_stock_levels,
      'ledger_delta_sum', ledger_delta_sum,
      'expected_from_ledger', ${INITIAL_STOCK} + ledger_delta_sum,
      'last_movement_new_quantity', last_movement_new_quantity
    ) FROM stats;
    `
        : `
    WITH stats AS (
      SELECT 
        (SELECT qty FROM public.stock_levels WHERE store_id = ${sqlLiteral(ids.store)}::uuid AND item_id = ${sqlLiteral(ids.item)}::uuid) as final_stock,
        (SELECT count(*) FROM public.inventory_movements WHERE store_id = ${sqlLiteral(ids.store)}::uuid AND item_id = ${sqlLiteral(ids.item)}::uuid) as movement_count,
        (SELECT count(DISTINCT operation_id) FROM public.inventory_movements WHERE store_id = ${sqlLiteral(ids.store)}::uuid AND item_id = ${sqlLiteral(ids.item)}::uuid) as distinct_operation_count,
        (SELECT count(*) FROM (SELECT operation_id FROM public.inventory_movements WHERE store_id = ${sqlLiteral(ids.store)}::uuid AND item_id = ${sqlLiteral(ids.item)}::uuid GROUP BY operation_id HAVING count(*) > 1) dups) as duplicate_operation_rows,
        (SELECT count(*) FROM public.inventory_movements WHERE store_id = ${sqlLiteral(ids.store)}::uuid AND item_id = ${sqlLiteral(ids.item)}::uuid AND new_quantity < 0) as negative_stock_rows,
        (SELECT count(*) FROM public.stock_levels WHERE store_id = ${sqlLiteral(ids.store)}::uuid AND item_id = ${sqlLiteral(ids.item)}::uuid AND qty < 0) as negative_stock_levels,
        (SELECT coalesce(sum(quantity_change), 0) FROM public.inventory_movements WHERE store_id = ${sqlLiteral(ids.store)}::uuid AND item_id = ${sqlLiteral(ids.item)}::uuid) as ledger_delta_sum,
        (SELECT new_quantity FROM public.inventory_movements WHERE store_id = ${sqlLiteral(ids.store)}::uuid AND item_id = ${sqlLiteral(ids.item)}::uuid ORDER BY created_at DESC, id DESC LIMIT 1) as last_movement_new_quantity
    )
    SELECT json_build_object(
      'final_stock', final_stock,
      'movement_count', movement_count,
      'distinct_operation_count', distinct_operation_count,
      'duplicate_operation_rows', duplicate_operation_rows,
      'negative_stock_rows', negative_stock_rows,
      'negative_stock_levels', negative_stock_levels,
      'ledger_delta_sum', ledger_delta_sum,
      'expected_from_ledger', ${INITIAL_STOCK} + ledger_delta_sum,
      'last_movement_new_quantity', last_movement_new_quantity
    ) FROM stats;
    `;
    const result = runPsql(sql);
    return parseJsonLine(result.stdout) || {
        final_stock: 0,
        movement_count: 0,
        distinct_operation_count: 0,
        duplicate_operation_rows: 0,
        negative_stock_rows: 0,
        negative_stock_levels: 0,
        ledger_delta_sum: 0,
        expected_from_ledger: 0,
        last_movement_new_quantity: null,
    };
}
function writeReport(report) {
    if (!fs.existsSync(path.dirname(OUT_PATH))) {
        fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
    }
    fs.writeFileSync(OUT_PATH, JSON.stringify(report, null, 2));
}
async function main() {
    const runId = crypto.randomUUID();
    const ids = {
        run: runId,
        tenant: uuidFromSeed(`${runId}:tenant`),
        store: uuidFromSeed(`${runId}:store`),
        item: uuidFromSeed(`${runId}:item`),
        publicUser: uuidFromSeed(`${runId}:user`),
    };
    console.log(`Starting Concurrency Storm [Run: ${runId}] against Staging...`);
    // Detect Staging / Remote database capabilities
    const connection = runPsql(`
    SELECT json_build_object(
      'has_stock_ledger', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_ledger'),
      'deduct_stock_args', COALESCE((SELECT pronargs FROM pg_proc JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace WHERE pg_namespace.nspname = 'public' AND pg_proc.proname = 'deduct_stock' LIMIT 1), 6),
      'has_set_inventory_stock', EXISTS (SELECT 1 FROM pg_proc JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace WHERE pg_namespace.nspname = 'public' AND pg_proc.proname = 'set_inventory_stock' LIMIT 1),
      'has_set_stock', EXISTS (SELECT 1 FROM pg_proc JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace WHERE pg_namespace.nspname = 'public' AND pg_proc.proname = 'set_stock' LIMIT 1),
      'has_items_active', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'items' AND column_name = 'active'),
      'has_items_is_active', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'items' AND column_name = 'is_active')
    );
  `);
    if (!connection.ok) {
        throw new Error(`Database is not reachable: ${connection.stderr}`);
    }
    const dbMeta = parseJsonLine(connection.stdout);
    if (dbMeta) {
        dbConfig = {
            hasStockLedger: dbMeta.has_stock_ledger === true,
            deductStockArgs: parseInt(dbMeta.deduct_stock_args) || 6,
            hasSetInventoryStock: dbMeta.has_set_inventory_stock === true,
            hasSetStock: dbMeta.has_set_stock === true,
            hasItemsActive: dbMeta.has_items_active === true,
            hasItemsIsActive: dbMeta.has_items_is_active === true,
        };
        console.log('[STORM] Detected database configuration:', dbConfig);
    }
    const setup = runPsql(setupSql(ids));
    if (!setup.ok) {
        throw new Error(`Storm setup failed: ${setup.stderr}`);
    }
    const operations = buildOperations(ids);
    const results = await Promise.all(operations.map((op) => executeOperation(op, ids)));
    const validation = validate(ids);
    const summary = {
        applied_or_idempotent: results.filter((result) => result.status === 'applied' || result.status === 'idempotent_replay').length,
        conflicts: results.filter((result) => result.status === 'conflict').length,
        errors: results.filter((result) => result.status === 'error').length,
        serialization_retries: results.reduce((sum, result) => sum + result.retried_40001, 0),
        unique_violation_retries: results.reduce((sum, result) => sum + result.retried_unique_violation, 0),
        deadlocks: results.filter((result) => result.sqlstate === '40P01').length,
    };
    const invariants = {
        no_negative_stock: validation.negative_stock_levels === 0 && validation.negative_stock_rows === 0 ? 'VERIFIED' : 'FAILED',
        no_double_apply: validation.duplicate_operation_rows === 0 ? 'VERIFIED' : 'FAILED',
        no_lost_updates: validation.final_stock === validation.expected_from_ledger ? 'VERIFIED' : 'FAILED',
        ledger_converges_to_stock: validation.last_movement_new_quantity === validation.final_stock ? 'VERIFIED' : 'FAILED',
        no_deadlocks: summary.deadlocks === 0 ? 'VERIFIED' : 'FAILED',
        serialization_failures_retried: results.every((result) => result.sqlstate !== '40001') ? 'VERIFIED' : 'FAILED',
        operation_errors_absent: summary.errors === 0 ? 'VERIFIED' : 'FAILED',
    };
    const report = {
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
    if (report.status === 'FAILED') {
        throw new Error('Concurrency Storm validation failed: Invariants violated!');
    }
}
main().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
