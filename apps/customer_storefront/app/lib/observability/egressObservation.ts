export const MAX_OBSERVATION_REQUESTS = 500;
export const MAX_OBSERVATION_BYTES = 10 * 1024 * 1024; // 10 MB measurement & stop condition
export const MAX_OBSERVATION_SCENARIOS = 20;

export const PRODUCTION_PROJECT_REF = 'hvmyxyccfnkrbxqbhlnm';
export const APPROVED_TEST_PROJECT_REF = 'grxxenvdhfwzafzyykgo';

export type EgressCacheResult = 'unknown' | 'hit' | 'miss' | 'bypass';

export type EgressObservationRecord = {
  operation: string;
  rpcVersion: string | null;
  sourceSurface: string;
  routeFamily: string;
  deploymentSha: string;
  processId: string;
  navigationId: string;
  projectionVersion: string;
  cacheResult: EgressCacheResult;
  rows: number | null;
  status: number;
  latencyMs: number;
  responseBytes: number;
};

export type EgressObservationContext = {
  sourceSurface?: string;
  routeFamily?: string;
  deploymentSha?: string;
  navigationId?: string;
  projectionVersion?: string;
  cacheResult?: EgressCacheResult;
};

type BudgetCap = 'requests' | 'bytes' | 'scenarios';

export class EgressProductionRefusal extends Error {
  constructor(message = 'Egress benchmark refused: production or non-staging target') {
    super(message);
    this.name = 'EgressProductionRefusal';
  }
}

export class EgressBudgetExceeded extends Error {
  readonly cap: BudgetCap;

  constructor(cap: BudgetCap) {
    super(`Egress benchmark stopped: ${cap} cap`);
    this.name = 'EgressBudgetExceeded';
    this.cap = cap;
  }
}

/**
 * Benchmark budget controller.
 * Note: This budget enforcement is process-local and in-memory.
 * Under multi-process, clustered, or serverless horizontal scale, each instance
 * tracks its local budget independently unless unified via distributed state.
 *
 * The byte budget is a measurement/stop threshold: individual in-flight network transfers
 * complete before their measured payload is added to the budget. It acts as a safety stop
 * preventing further requests, not an OS or network-socket level packet ceiling.
 */
export class EgressBenchmarkBudget {
  requestsReserved = 0;
  requestsCompleted = 0;
  bytes = 0;
  scenarios = 0;
  blocked: BudgetCap | null = null;

  beforeRequest(): void {
    if (this.blocked) throw new EgressBudgetExceeded(this.blocked);
    if (this.bytes >= MAX_OBSERVATION_BYTES) {
      this.blocked = 'bytes';
      throw new EgressBudgetExceeded('bytes');
    }
    if (this.scenarios >= MAX_OBSERVATION_SCENARIOS) {
      this.blocked = 'scenarios';
      throw new EgressBudgetExceeded('scenarios');
    }
    // Atomic pre-reservation for concurrent calls in the same event loop tick
    if (this.requestsReserved >= MAX_OBSERVATION_REQUESTS) {
      this.blocked = 'requests';
      throw new EgressBudgetExceeded('requests');
    }
    this.requestsReserved += 1;
  }

  afterResponse(byteCount: number): void {
    this.requestsCompleted += 1;
    this.bytes += byteCount;
    if (this.requestsReserved >= MAX_OBSERVATION_REQUESTS || this.requestsCompleted >= MAX_OBSERVATION_REQUESTS) {
      this.blocked = 'requests';
    }
    if (this.bytes >= MAX_OBSERVATION_BYTES) {
      this.blocked = 'bytes';
    }
  }

  onFetchFailed(): void {
    // If request failed at network level, release reservation so budget stays consistent
    if (this.requestsReserved > this.requestsCompleted) {
      this.requestsReserved -= 1;
    }
  }

  openScenario(): void {
    if (this.blocked) throw new EgressBudgetExceeded(this.blocked);
    if (this.scenarios >= MAX_OBSERVATION_SCENARIOS) {
      this.blocked = 'scenarios';
      throw new EgressBudgetExceeded('scenarios');
    }
    this.scenarios += 1;
  }
}

export function extractSupabaseProjectRef(rawUrl?: string): string | null {
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl);
    if (!parsed.hostname.endsWith('.supabase.co')) return null;
    return parsed.hostname.split('.')[0] || null;
  } catch {
    const match = /https?:\/\/([a-z0-9_-]+)\.supabase\.co/i.exec(rawUrl);
    return match?.[1] || null;
  }
}

export function isExplicitStagingEnvironment(env: Record<string, string | undefined>): boolean {
  if (env.EGRESS_OBSERVATION !== '1') return false;

  const vercelEnv = env.VERCEL_ENV?.toLowerCase();
  const nodeEnv = env.NODE_ENV?.toLowerCase();
  const appEnv = (env.APP_ENV ?? env.ENVIRONMENT ?? '').toLowerCase();

  // Fail closed: any explicit production indicator on Vercel or app environment fails closed
  if (vercelEnv === 'production' || appEnv === 'production') {
    return false;
  }

  // Check known production hosts
  const host = (env.EGRESS_APP_HOST ?? env.HOST ?? '').toLowerCase().split(':')[0];
  if (host === 'luckystore1947.com' || host.endsWith('.luckystore1947.com')) {
    return false;
  }

  // Verified staging indicators:
  // 1. Vercel preview deployment
  // 2. Explicit staging/preview/test environment (e.g. APP_ENV=staging even if NODE_ENV=production in container/server build)
  // 3. Local/test runners (NODE_ENV=test or development)
  const isVercelPreview = vercelEnv === 'preview';
  const isStagingEnv = appEnv === 'staging' || appEnv === 'preview' || appEnv === 'test';
  const isLocalOrTestNode = nodeEnv === 'test' || nodeEnv === 'development';

  if (!isVercelPreview && !isStagingEnv && !isLocalOrTestNode) {
    return false;
  }

  // Target validation: Must target approved test project ref
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL ?? '';
  const projectRef = extractSupabaseProjectRef(supabaseUrl);
  if (!projectRef) return false;
  if (projectRef === PRODUCTION_PROJECT_REF) return false;
  if (projectRef !== APPROVED_TEST_PROJECT_REF && !env.ALLOW_CUSTOM_TEST_SUPABASE_REF) {
    return false;
  }

  return true;
}

export function isProductionEgressTarget(input: {
  supabaseUrl?: string;
  appHost?: string;
  vercelEnv?: string;
  nodeEnv?: string;
}): boolean {
  const supabaseUrl = input.supabaseUrl?.toLowerCase() ?? '';
  const appHost = input.appHost?.toLowerCase().split(':')[0] ?? '';
  const vercelEnv = input.vercelEnv?.toLowerCase() ?? '';

  if (supabaseUrl.includes(PRODUCTION_PROJECT_REF)) return true;
  if (appHost === 'luckystore1947.com' || appHost.endsWith('.luckystore1947.com')) return true;
  if (vercelEnv === 'production') return true;
  return false;
}

export function assertEgressBenchmarkAllowed(input: {
  supabaseUrl?: string;
  appHost?: string;
  vercelEnv?: string;
  nodeEnv?: string;
}): void {
  if (isProductionEgressTarget(input)) {
    throw new EgressProductionRefusal('Egress benchmark refused: production target detected');
  }

  const projectRef = extractSupabaseProjectRef(input.supabaseUrl);
  if (!projectRef || projectRef !== APPROVED_TEST_PROJECT_REF) {
    throw new EgressProductionRefusal('Egress benchmark refused: target must be the approved test Supabase project');
  }
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

export function classifyOperation(url: string): { operation: string; rpcVersion: string | null } {
  let pathname = url;
  try {
    pathname = new URL(url).pathname;
  } catch {
    pathname = url.split('?')[0] ?? url;
  }
  const parts = pathname.split('/').filter(Boolean).map((part) => {
    try {
      return decodeURIComponent(part);
    } catch {
      return part;
    }
  });
  const rpcIndex = parts.lastIndexOf('rpc');
  if (rpcIndex >= 0 && parts[rpcIndex + 1]) {
    const name = parts[rpcIndex + 1];
    return {
      operation: `rpc:${name}`,
      rpcVersion: /_v(\d+)$/.exec(name)?.[1] ?? null,
    };
  }
  const versionIndex = parts.lastIndexOf('v1');
  const table = versionIndex >= 0 ? parts[versionIndex + 1] : parts[parts.length - 1];
  return { operation: `table:${table ?? 'unknown'}`, rpcVersion: null };
}

async function measureResponse(response: Response): Promise<{ bytes: number; rows: number | null }> {
  try {
    const text = await response.text();
    const bytes = new TextEncoder().encode(text).length;
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('json')) return { bytes, rows: null };
    try {
      const parsed = JSON.parse(text) as unknown;
      return { bytes, rows: Array.isArray(parsed) ? parsed.length : null };
    } catch {
      return { bytes, rows: null };
    }
  } catch {
    return { bytes: 0, rows: null };
  }
}

function resolveSafeProcessId(): string {
  try {
    if (typeof process !== 'undefined' && 'pid' in process && typeof process.pid === 'number') {
      return String(process.pid);
    }
  } catch {
    // Edge runtime throws on accessing disallowed process properties
  }
  return 'edge-or-browser';
}

export function createObservedFetch(
  inner: typeof fetch,
  options: {
    enabled: boolean;
    benchmark: boolean;
    supabaseUrl: string;
    appHost?: string;
    vercelEnv?: string;
    nodeEnv?: string;
    sink?: (record: EgressObservationRecord) => void;
    now?: () => number;
    context?: () => EgressObservationContext;
    budget?: EgressBenchmarkBudget;
    processId?: string;
  },
): typeof fetch {
  return async (input, init) => {
    const url = requestUrl(input);
    const targetCheck = {
      supabaseUrl: `${options.supabaseUrl} ${url}`,
      appHost: options.appHost,
      vercelEnv: options.vercelEnv,
      nodeEnv: options.nodeEnv,
    };

    if (isProductionEgressTarget(targetCheck)) {
      if (options.benchmark) throw new EgressProductionRefusal();
      return inner(input, init);
    }

    if (!options.enabled && !options.benchmark) {
      return inner(input, init);
    }

    if (options.benchmark) {
      assertEgressBenchmarkAllowed(targetCheck);
      options.budget?.beforeRequest();
    }

    const started = options.now?.() ?? Date.now();
    let response: Response;
    try {
      response = await inner(input, init);
    } catch (err) {
      if (options.benchmark) {
        options.budget?.onFetchFailed();
      }
      throw err;
    }

    // Safely clone response for measurement without consuming or mutating the caller stream
    let clonedResponse: Response | null = null;
    try {
      clonedResponse = response.clone();
    } catch {
      clonedResponse = null;
    }

    if (clonedResponse) {
      measureResponse(clonedResponse).then((measured) => {
        const context = options.context?.() ?? {};
        const record: EgressObservationRecord = {
          ...classifyOperation(url),
          sourceSurface: context.sourceSurface ?? 'unknown',
          routeFamily: context.routeFamily ?? 'unknown',
          deploymentSha: context.deploymentSha ?? 'unknown',
          processId: options.processId ?? resolveSafeProcessId(),
          navigationId: context.navigationId ?? 'unknown',
          projectionVersion: context.projectionVersion ?? 'unknown',
          cacheResult: context.cacheResult ?? 'unknown',
          rows: measured.rows,
          status: response.status,
          latencyMs: Math.max(0, (options.now?.() ?? Date.now()) - started),
          responseBytes: measured.bytes,
        };
        options.sink?.(record);
        if (options.benchmark) {
          options.budget?.afterResponse(measured.bytes);
        }
      }).catch(() => {
        // Measurement error must never affect the caller
      });
    }

    return response;
  };
}

// Scoped caller attribution: dynamically resolves AsyncLocalStorage when in Node.js
// using non-statically-analyzable evaluation, and falls back to an isomorphic scoped store
// for Edge/Browser runtimes so Webpack does not fail on unhandled "node:" URI schemes.
interface ContextStorage {
  getStore(): EgressObservationContext | undefined;
  run<R>(store: EgressObservationContext, callback: () => R): R;
}

function initContextStorage(): ContextStorage {
  try {
    if (typeof globalThis !== 'undefined' && (globalThis as any).AsyncLocalStorage) {
      const ALS = (globalThis as any).AsyncLocalStorage;
      const instance = new ALS();
      return {
        getStore: () => instance.getStore(),
        run: (store, cb) => instance.run(store, cb),
      };
    }

    if (typeof process !== 'undefined' && typeof require === 'function') {
      const modName = 'async_hooks';
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ah = require(modName);
      if (ah?.AsyncLocalStorage) {
        const instance = new ah.AsyncLocalStorage();
        return {
          getStore: () => instance.getStore(),
          run: (store: EgressObservationContext, cb: () => any) => instance.run(store, cb),
        };
      }
    }
  } catch {
    // Edge or browser environment
  }

  let currentStore: EgressObservationContext | undefined;
  return {
    getStore: () => currentStore,
    run: (store, cb) => {
      const prev = currentStore;
      currentStore = store;
      try {
        return cb();
      } finally {
        currentStore = prev;
      }
    },
  };
}

const callerStorage = initContextStorage();

export function withCallerContext<T>(context: EgressObservationContext, fn: () => T): T {
  const current = callerStorage.getStore() ?? {};
  return callerStorage.run({ ...current, ...context }, fn);
}

export function getActiveCallerContext(): EgressObservationContext {
  return callerStorage.getStore() ?? {};
}

type ObservationEnv = Record<string, string | undefined>;

export function buildSupabaseClientOptions(env: ObservationEnv = process.env): {
  global?: { fetch: typeof fetch };
} {
  // Fail closed: require explicit staging verification
  if (!isExplicitStagingEnvironment(env)) {
    return {};
  }

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL ?? '';
  const appHost = env.EGRESS_APP_HOST ?? env.HOST;

  return {
    global: {
      fetch: createObservedFetch(globalThis.fetch.bind(globalThis), {
        enabled: true,
        benchmark: false,
        supabaseUrl,
        appHost,
        vercelEnv: env.VERCEL_ENV,
        nodeEnv: env.NODE_ENV,
        context: () => ({
          sourceSurface: 'storefront',
          routeFamily: getActiveCallerContext().routeFamily ?? 'unknown',
          deploymentSha: env.EGRESS_DEPLOYMENT_SHA ?? env.VERCEL_GIT_COMMIT_SHA ?? 'unknown',
          navigationId: getActiveCallerContext().navigationId ?? 'unknown',
          projectionVersion: getActiveCallerContext().projectionVersion ?? 'unknown',
          cacheResult: getActiveCallerContext().cacheResult ?? 'unknown',
        }),
      }),
    },
  };
}
