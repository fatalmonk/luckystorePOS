import { describe, expect, it, vi } from 'vitest';
import {
  APPROVED_TEST_PROJECT_REF,
  EgressBenchmarkBudget,
  EgressBudgetExceeded,
  EgressProductionRefusal,
  MAX_OBSERVATION_BYTES,
  MAX_OBSERVATION_REQUESTS,
  MAX_OBSERVATION_SCENARIOS,
  PRODUCTION_PROJECT_REF,
  assertEgressBenchmarkAllowed,
  buildSupabaseClientOptions,
  createObservedFetch,
  extractSupabaseProjectRef,
  getActiveCallerContext,
  isExplicitStagingEnvironment,
  isProductionEgressTarget,
  withCallerContext,
  type EgressObservationRecord,
} from './egressObservation';

const TEST_URL = `https://${APPROVED_TEST_PROJECT_REF}.supabase.co`;
const PRODUCTION_URL = `https://${PRODUCTION_PROJECT_REF}.supabase.co`;
const SECRET = 'Bearer super-secret-token';
const SEARCH = 'user-typed-query';
const PRODUCT = 'GoldenMangoSecret';
const ADDRESS = 'House 12 Road 5';
const IP = '203.0.113.10';
const CUSTOMER = 'cust_12345';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('egress observation', () => {
  it('leaves fetch unchanged when observation is off', async () => {
    const inner = vi.fn(async () => jsonResponse([]));
    const sink = vi.fn();
    const fetchImpl = createObservedFetch(inner, {
      enabled: false,
      benchmark: false,
      supabaseUrl: TEST_URL,
      sink,
    });

    const response = await fetchImpl(`${TEST_URL}/rest/v1/rpc/search_storefront_catalog_v2`, { method: 'POST' });

    expect(response.status).toBe(200);
    expect(inner).toHaveBeenCalledOnce();
    expect(sink).not.toHaveBeenCalled();
  });

  it('records a redacted RPC observation and drops query, body, and header secrets', async () => {
    const inner = vi.fn(async () => jsonResponse([{ name: PRODUCT, address: ADDRESS }]));
    const records: EgressObservationRecord[] = [];
    const fetchImpl = createObservedFetch(inner, {
      enabled: true,
      benchmark: false,
      supabaseUrl: TEST_URL,
      now: () => 1_000,
      sink: (record) => records.push(record),
      context: () => ({
        sourceSurface: 'storefront',
        routeFamily: 'pdp',
        deploymentSha: 'bbdb3428',
        navigationId: 'nav_test',
        projectionVersion: 'catalog-v2',
        cacheResult: 'miss',
      }),
    });

    await fetchImpl(`${TEST_URL}/rest/v1/rpc/search_storefront_catalog_v2?q=${SEARCH}`, {
      method: 'POST',
      headers: {
        Authorization: SECRET,
        apikey: 'anon-key-secret',
        cookie: 'session=secret',
        'x-forwarded-for': IP,
        'x-customer-id': CUSTOMER,
      },
      body: JSON.stringify({ query: SEARCH, name: PRODUCT, address: ADDRESS }),
    });

    await new Promise((resolve) => setTimeout(resolve, 15));

    expect(records).toHaveLength(1);
    const record = records[0];
    expect(record).toMatchObject({
      operation: 'rpc:search_storefront_catalog_v2',
      rpcVersion: '2',
      sourceSurface: 'storefront',
      routeFamily: 'pdp',
      deploymentSha: 'bbdb3428',
      navigationId: 'nav_test',
      projectionVersion: 'catalog-v2',
      cacheResult: 'miss',
      rows: 1,
      status: 200,
      responseBytes: expect.any(Number),
    });
    expect(record.responseBytes).toBeGreaterThan(0);
    const serialized = JSON.stringify(record);
    for (const secret of [SECRET, 'anon-key-secret', SEARCH, PRODUCT, ADDRESS, IP, CUSTOMER, 'session=secret']) {
      expect(serialized).not.toContain(secret);
    }
    expect(Object.keys(record).sort()).toEqual([
      'cacheResult',
      'deploymentSha',
      'latencyMs',
      'navigationId',
      'operation',
      'processId',
      'projectionVersion',
      'responseBytes',
      'routeFamily',
      'rows',
      'rpcVersion',
      'sourceSurface',
      'status',
    ]);
  });

  it('does not observe production and refuses a production benchmark before fetch', async () => {
    const inner = vi.fn(async () => jsonResponse([]));
    const sink = vi.fn();
    const silent = createObservedFetch(inner, {
      enabled: true,
      benchmark: false,
      supabaseUrl: PRODUCTION_URL,
      appHost: 'luckystore1947.com',
      sink,
    });
    await silent(`${PRODUCTION_URL}/rest/v1/items`);
    expect(inner).toHaveBeenCalledOnce();
    expect(sink).not.toHaveBeenCalled();

    const blocked = createObservedFetch(inner, {
      enabled: true,
      benchmark: true,
      supabaseUrl: PRODUCTION_URL,
      sink,
    });
    await expect(blocked(`${PRODUCTION_URL}/rest/v1/items`)).rejects.toBeInstanceOf(EgressProductionRefusal);
    expect(inner).toHaveBeenCalledOnce();
    expect(() => assertEgressBenchmarkAllowed({ supabaseUrl: PRODUCTION_URL })).toThrow(EgressProductionRefusal);
    expect(() => assertEgressBenchmarkAllowed({
      supabaseUrl: TEST_URL,
      appHost: 'www.luckystore1947.com',
    })).toThrow(EgressProductionRefusal);
  });

  it('fails closed on unknown or production environments (including Hostinger and NODE_ENV=production combinations)', () => {
    // Missing EGRESS_OBSERVATION flag
    expect(isExplicitStagingEnvironment({})).toBe(false);

    // Hostinger production host
    expect(isExplicitStagingEnvironment({
      EGRESS_OBSERVATION: '1',
      NODE_ENV: 'production',
      HOST: 'luckystore1947.com',
      NEXT_PUBLIC_SUPABASE_URL: TEST_URL,
    })).toBe(false);

    // Vercel production
    expect(isExplicitStagingEnvironment({
      EGRESS_OBSERVATION: '1',
      VERCEL_ENV: 'production',
      NEXT_PUBLIC_SUPABASE_URL: TEST_URL,
    })).toBe(false);

    // Unknown environment (empty env vars without explicit staging indicator)
    expect(isExplicitStagingEnvironment({
      EGRESS_OBSERVATION: '1',
      NEXT_PUBLIC_SUPABASE_URL: TEST_URL,
    })).toBe(false);

    // Production Supabase URL
    expect(isExplicitStagingEnvironment({
      EGRESS_OBSERVATION: '1',
      VERCEL_ENV: 'preview',
      NEXT_PUBLIC_SUPABASE_URL: PRODUCTION_URL,
    })).toBe(false);

    // Staging container with NODE_ENV=production, APP_ENV=staging, targeting approved test ref -> ACTIVATES
    expect(isExplicitStagingEnvironment({
      EGRESS_OBSERVATION: '1',
      NODE_ENV: 'production',
      APP_ENV: 'staging',
      NEXT_PUBLIC_SUPABASE_URL: TEST_URL,
    })).toBe(true);

    // Staging container with NODE_ENV=production, APP_ENV=production, targeting approved test ref -> FAILS CLOSED
    expect(isExplicitStagingEnvironment({
      EGRESS_OBSERVATION: '1',
      NODE_ENV: 'production',
      APP_ENV: 'production',
      NEXT_PUBLIC_SUPABASE_URL: TEST_URL,
    })).toBe(false);

    // Verified staging environment: Vercel preview + approved test ref
    expect(isExplicitStagingEnvironment({
      EGRESS_OBSERVATION: '1',
      VERCEL_ENV: 'preview',
      NEXT_PUBLIC_SUPABASE_URL: TEST_URL,
    })).toBe(true);

    // Verified staging environment: NODE_ENV=test + approved test ref
    expect(isExplicitStagingEnvironment({
      EGRESS_OBSERVATION: '1',
      NODE_ENV: 'test',
      NEXT_PUBLIC_SUPABASE_URL: TEST_URL,
    })).toBe(true);
  });

  it('stops a benchmark at request, byte, and scenario caps and reserves request budget atomically', async () => {
    const inner = vi.fn(async () => jsonResponse([1]));
    const requests = new EgressBenchmarkBudget();
    requests.requestsReserved = MAX_OBSERVATION_REQUESTS;
    const limited = createObservedFetch(inner, {
      enabled: true,
      benchmark: true,
      supabaseUrl: TEST_URL,
      budget: requests,
    });
    await expect(limited(`${TEST_URL}/rest/v1/items`)).rejects.toBeInstanceOf(EgressBudgetExceeded);
    expect(inner).not.toHaveBeenCalled();

    const bytes = new EgressBenchmarkBudget();
    bytes.bytes = MAX_OBSERVATION_BYTES;
    const byteLimited = createObservedFetch(inner, {
      enabled: true,
      benchmark: true,
      supabaseUrl: TEST_URL,
      budget: bytes,
    });
    await expect(byteLimited(`${TEST_URL}/rest/v1/items`)).rejects.toMatchObject({ cap: 'bytes' });

    const scenarios = new EgressBenchmarkBudget();
    for (let i = 0; i < MAX_OBSERVATION_SCENARIOS; i += 1) scenarios.openScenario();
    expect(() => scenarios.openScenario()).toThrow(EgressBudgetExceeded);
    expect(scenarios.blocked).toBe('scenarios');
  });

  it('rejects concurrent requests once reservation reaches MAX_OBSERVATION_REQUESTS without admitting extra fetches', async () => {
    const budget = new EgressBenchmarkBudget();
    budget.requestsReserved = MAX_OBSERVATION_REQUESTS - 1;

    let resolveFetch: (val: Response) => void = () => {};
    const inner = vi.fn(() => new Promise<Response>((res) => { resolveFetch = res; }));
    const fetchImpl = createObservedFetch(inner, {
      enabled: true,
      benchmark: true,
      supabaseUrl: TEST_URL,
      budget,
    });

    // First request takes the last slot
    const req1 = fetchImpl(`${TEST_URL}/rest/v1/items`);
    // Second concurrent request should be rejected immediately before inner fetch is invoked
    await expect(fetchImpl(`${TEST_URL}/rest/v1/items`)).rejects.toBeInstanceOf(EgressBudgetExceeded);

    expect(inner).toHaveBeenCalledTimes(1);
    resolveFetch(jsonResponse([]));
    await req1;
  });

  it('preserves native fetch errors and releases reservation without crashing observer', async () => {
    const budget = new EgressBenchmarkBudget();
    const networkError = new TypeError('Failed to fetch (DNS error)');
    const inner = vi.fn(async () => {
      throw networkError;
    });
    const sink = vi.fn();
    const fetchImpl = createObservedFetch(inner, {
      enabled: true,
      benchmark: true,
      supabaseUrl: TEST_URL,
      budget,
      sink,
    });

    await expect(fetchImpl(`${TEST_URL}/rest/v1/items`)).rejects.toThrow(networkError);
    expect(inner).toHaveBeenCalledOnce();
    expect(sink).not.toHaveBeenCalled();
    // Reservation was released after network failure
    expect(budget.requestsReserved).toBe(0);
    expect(budget.requestsCompleted).toBe(0);
  });

  it('keeps caller response body stream readable and intact', async () => {
    const responsePayload = { message: 'hello world', data: [1, 2, 3] };
    const inner = vi.fn(async () => jsonResponse(responsePayload));
    const sink = vi.fn();
    const fetchImpl = createObservedFetch(inner, {
      enabled: true,
      benchmark: false,
      supabaseUrl: TEST_URL,
      sink,
    });

    const response = await fetchImpl(`${TEST_URL}/rest/v1/items`);
    // Caller can consume json without "body already used" error
    const data = await response.json();
    expect(data).toEqual(responsePayload);

    await new Promise((resolve) => setTimeout(resolve, 15));
    expect(sink).toHaveBeenCalledOnce();
  });

  it('isolates caller context across concurrent asynchronous operations without crosstalk', async () => {
    const runAsyncRoute = async (route: string) => {
      return withCallerContext({ routeFamily: route }, async () => {
        // Yield to event loop to simulate realistic async delay
        await new Promise((res) => setTimeout(res, 5));
        return getActiveCallerContext().routeFamily;
      });
    };

    const [routeA, routeB, routeC] = await Promise.all([
      runAsyncRoute('pdp'),
      runAsyncRoute('catalog'),
      runAsyncRoute('cart'),
    ]);

    expect(routeA).toBe('pdp');
    expect(routeB).toBe('catalog');
    expect(routeC).toBe('cart');
    // Root context remains empty
    expect(getActiveCallerContext()).toEqual({});
  });

  it('keeps client options empty unless staging observation is explicitly enabled', () => {
    expect(buildSupabaseClientOptions({
      EGRESS_OBSERVATION: undefined,
      NEXT_PUBLIC_SUPABASE_URL: TEST_URL,
    })).toEqual({});
    expect(buildSupabaseClientOptions({
      EGRESS_OBSERVATION: '1',
      NEXT_PUBLIC_SUPABASE_URL: PRODUCTION_URL,
    })).toEqual({});

    const options = buildSupabaseClientOptions({
      EGRESS_OBSERVATION: '1',
      NODE_ENV: 'test',
      NEXT_PUBLIC_SUPABASE_URL: TEST_URL,
      EGRESS_DEPLOYMENT_SHA: 'bbdb3428',
    });
    expect(options.global?.fetch).toEqual(expect.any(Function));
  });
});
