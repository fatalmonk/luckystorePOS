import { ReplayModel, ReplayOperation, assertReplayInvariants } from './model';

export interface ProofResult {
  name: string;
  passed: boolean;
  fingerprints: string[];
  evidence: any;
}

export function testIdempotencyVerification(): ProofResult {
  const model = new ReplayModel({ 'item-a': 10 });
  const operation: ReplayOperation = {
    operationId: 'idem-op-1',
    transactionTraceId: 'idem-trace-1',
    storeId: 'store-1',
    cashierId: 'cashier-1',
    lines: [{ itemId: 'item-a', quantity: 2 }],
  };
  const conflictingPayload: ReplayOperation = {
    ...operation,
    lines: [{ itemId: 'item-a', quantity: 5 }],
  };

  const firstAck = model.apply(operation);
  const fingerprintAfterFirstApply = model.fingerprint();
  const duplicateAck = model.apply(operation);
  const fingerprintAfterDuplicate = model.fingerprint();
  const conflictAck = model.apply(conflictingPayload);

  assertReplayInvariants(model);

  if (firstAck.status !== 'applied') {
    throw new Error(`IDEMPOTENCY_FIRST_ACK:${firstAck.status}`);
  }
  if (duplicateAck.status !== 'duplicate') {
    throw new Error(`IDEMPOTENCY_DUPLICATE_ACK:${duplicateAck.status}`);
  }
  if (fingerprintAfterDuplicate !== fingerprintAfterFirstApply) {
    throw new Error('IDEMPOTENCY_DUPLICATE_CHANGED_STATE');
  }
  if (conflictAck.status !== 'rejected') {
    throw new Error(`IDEMPOTENCY_CONFLICT_NOT_REJECTED:${conflictAck.status}`);
  }

  return {
    name: 'idempotency',
    passed: true,
    fingerprints: [fingerprintAfterFirstApply, fingerprintAfterDuplicate, model.fingerprint()],
    evidence: {
      first_ack: firstAck.status,
      duplicate_ack: duplicateAck.status,
      conflicting_payload_ack: conflictAck.status,
      conflicting_payload_reason: conflictAck.status === 'rejected' ? conflictAck.reason : null,
    },
  };
}
