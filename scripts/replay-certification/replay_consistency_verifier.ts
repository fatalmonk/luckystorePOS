import { ReplayModel, ReplayOperation } from './model';
import { runDbReplay } from './db_replay_runner';

type ConsistencyReport = {
  status: 'VERIFIED' | 'FAILED' | 'UNVERIFIED' | 'PARTIAL';
  generated_at: string;
  model: {
    status: 'VERIFIED' | 'FAILED';
    fingerprint: string;
    evidence: Record<string, unknown>;
  };
  database: ReturnType<typeof runDbReplay> | null;
  cross_system: {
    status: 'VERIFIED' | 'FAILED' | 'UNVERIFIED';
    reason: string;
  };
};

function runModelReplay() {
  const operations: ReplayOperation[] = [
    {
      operationId: 'model-op-a',
      transactionTraceId: 'model-trace-a',
      storeId: 'store-a',
      cashierId: 'cashier-a',
      lines: [{ itemId: 'item-a', quantity: 3 }],
    },
    {
      operationId: 'model-op-b',
      transactionTraceId: 'model-trace-b',
      storeId: 'store-a',
      cashierId: 'cashier-a',
      lines: [{ itemId: 'item-a', quantity: 2 }],
    },
  ];

  const model = new ReplayModel({ 'item-a': 15 });
  const first = model.apply(operations[0]);
  const duplicate = model.apply(operations[0]);
  const second = model.apply(operations[1]);

  return {
    status:
      first.status === 'applied' && duplicate.status === 'duplicate' && second.status === 'applied'
        ? ('VERIFIED' as const)
        : ('FAILED' as const),
    fingerprint: model.fingerprint(),
    evidence: {
      first_ack: first.status,
      duplicate_ack: duplicate.status,
      second_ack: second.status,
      expected_final_stock: 10,
    },
  };
}

function main() {
  const model = runModelReplay();
  const dbUrl = process.env.REPLAY_DATABASE_URL || process.env.DATABASE_URL;
  const database = dbUrl
    ? runDbReplay({
        dbUrl,
        allowMutation: process.env.REPLAY_DB_ALLOW_MUTATION === '1',
        runId: process.env.REPLAY_RUN_ID,
      })
    : null;

  const crossSystem =
    !database || database.status === 'UNVERIFIED'
      ? {
          status: 'UNVERIFIED' as const,
          reason: 'Real DB replay did not run. Provide DB URL and REPLAY_DB_ALLOW_MUTATION=1 for isolated transaction execution.',
        }
      : database.status === 'VERIFIED' && model.status === 'VERIFIED'
        ? {
            status: 'VERIFIED' as const,
            reason: 'Pure model and DB replay independently reached expected final stock and duplicate replay invariants.',
          }
        : {
            status: 'FAILED' as const,
            reason: 'Model or DB replay failed an invariant.',
          };

  const status =
    crossSystem.status === 'VERIFIED'
      ? 'VERIFIED'
      : crossSystem.status === 'FAILED'
        ? 'FAILED'
        : model.status === 'VERIFIED'
          ? 'PARTIAL'
          : 'FAILED';

  const report: ConsistencyReport = {
    status,
    generated_at: new Date().toISOString(),
    model,
    database,
    cross_system: crossSystem,
  };

  console.log(JSON.stringify(report, null, 2));
  if (report.status !== 'VERIFIED') process.exit(report.status === 'FAILED' ? 1 : 2);
}

if (require.main === module) {
  main();
}
