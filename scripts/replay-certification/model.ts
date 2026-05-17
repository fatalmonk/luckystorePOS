import { createHash } from 'crypto';

export type ReplayAck =
  | { status: 'applied'; operationId: string }
  | { status: 'duplicate'; operationId: string }
  | { status: 'rejected'; operationId: string; reason: string };

export type ReplayLine = {
  itemId: string;
  quantity: number;
};

export type ReplayOperation = {
  operationId: string;
  transactionTraceId: string;
  storeId: string;
  cashierId: string;
  lines: ReplayLine[];
};

export type ReplaySnapshot = {
  stock: Record<string, number>;
  ledger: Record<string, string>;
  acked: Record<string, string>;
};

export class ReplayModel {
  private readonly stock = new Map<string, number>();
  private readonly ledger = new Map<string, string>();
  private readonly acked = new Map<string, string>();

  constructor(seedStock: Record<string, number>) {
    for (const [itemId, qty] of Object.entries(seedStock)) {
      this.stock.set(itemId, qty);
    }
  }

  clone(): ReplayModel {
    return ReplayModel.fromSnapshot(this.snapshot());
  }

  static fromSnapshot(snapshot: ReplaySnapshot): ReplayModel {
    const model = new ReplayModel(snapshot.stock);
    for (const [operationId, payloadHash] of Object.entries(snapshot.ledger)) {
      model.ledger.set(operationId, payloadHash);
    }
    for (const [operationId, payloadHash] of Object.entries(snapshot.acked)) {
      model.acked.set(operationId, payloadHash);
    }
    return model;
  }

  apply(operation: ReplayOperation): ReplayAck {
    const payloadHash = hashCanonical(operationPayload(operation));
    const existing = this.ledger.get(operation.operationId);

    if (existing != null) {
      if (existing !== payloadHash) {
        return {
          status: 'rejected',
          operationId: operation.operationId,
          reason: 'operation_id_payload_mismatch',
        };
      }
      this.acked.set(operation.operationId, payloadHash);
      return { status: 'duplicate', operationId: operation.operationId };
    }

    for (const line of operation.lines) {
      const current = this.stock.get(line.itemId);
      if (current == null) {
        return {
          status: 'rejected',
          operationId: operation.operationId,
          reason: `missing_stock:${line.itemId}`,
        };
      }
      if (line.quantity <= 0 || !Number.isInteger(line.quantity)) {
        return {
          status: 'rejected',
          operationId: operation.operationId,
          reason: `invalid_quantity:${line.itemId}`,
        };
      }
      if (current < line.quantity) {
        return {
          status: 'rejected',
          operationId: operation.operationId,
          reason: `insufficient_stock:${line.itemId}`,
        };
      }
    }

    for (const line of operation.lines) {
      this.stock.set(line.itemId, this.stock.get(line.itemId)! - line.quantity);
    }
    this.ledger.set(operation.operationId, payloadHash);
    this.acked.set(operation.operationId, payloadHash);
    return { status: 'applied', operationId: operation.operationId };
  }

  commitWithoutAck(operation: ReplayOperation): void {
    const payloadHash = hashCanonical(operationPayload(operation));
    if (this.ledger.has(operation.operationId)) {
      return;
    }
    for (const line of operation.lines) {
      const current = this.stock.get(line.itemId);
      if (current == null || current < line.quantity) {
        throw new Error(`cannot_commit:${operation.operationId}`);
      }
    }
    for (const line of operation.lines) {
      this.stock.set(line.itemId, this.stock.get(line.itemId)! - line.quantity);
    }
    this.ledger.set(operation.operationId, payloadHash);
  }

  replay(trace: ReplayOperation[]): ReplayAck[] {
    return trace.map((operation) => this.apply(operation));
  }

  snapshot(): ReplaySnapshot {
    return {
      stock: Object.fromEntries([...this.stock.entries()].sort(([a], [b]) => a.localeCompare(b))),
      ledger: Object.fromEntries([...this.ledger.entries()].sort(([a], [b]) => a.localeCompare(b))),
      acked: Object.fromEntries([...this.acked.entries()].sort(([a], [b]) => a.localeCompare(b))),
    };
  }

  fingerprint(): string {
    return hashCanonical(this.snapshot());
  }

  ledgerCount(operationId: string): number {
    return this.ledger.has(operationId) ? 1 : 0;
  }

  stockQty(itemId: string): number {
    return this.stock.get(itemId) ?? 0;
  }
}

export function assertReplayInvariants(model: ReplayModel): void {
  const snapshot = model.snapshot();
  for (const [itemId, qty] of Object.entries(snapshot.stock)) {
    if (!Number.isInteger(qty) || qty < 0) {
      throw new Error(`NEGATIVE_OR_INVALID_STOCK:${itemId}`);
    }
  }
  for (const [operationId, payloadHash] of Object.entries(snapshot.acked)) {
    if (snapshot.ledger[operationId] !== payloadHash) {
      throw new Error(`ACK_WITHOUT_MATCHING_LEDGER:${operationId}`);
    }
  }
}

export function hashCanonical(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

function operationPayload(operation: ReplayOperation): Omit<ReplayOperation, 'operationId'> {
  return {
    transactionTraceId: operation.transactionTraceId,
    storeId: operation.storeId,
    cashierId: operation.cashierId,
    lines: [...operation.lines].sort((a, b) => a.itemId.localeCompare(b.itemId)),
  };
}

function canonicalJson(value: unknown): string {
  if (value == null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`)
    .join(',')}}`;
}
