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
  clearCollectedObservations,
  createObservedFetch,
  extractSupabaseProjectRef,
  getActiveCallerContext,
  getCollectedObservations,
  isExplicitStagingEnvironment,
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
        runId: 'run-001',
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
      runId: 'run-001',
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
      'runId',
      'sourceSurface',
      'status',
    ]);
  });

  it('rejects plain HTTP Supabase URLs and requires HTTPS scheme', () => {
    expect(extractSupabaseProjectRef(`http://${APPROVED_TEST_PROJECT_REF}.supabase.co`)).toBeNull();
    expect(extractSupabaseProjectRef(`https://${APPROVED_TEST_PROJECT_REF}.supabase.co`)).toBe(APPROVED_TEST_PROJECT_REF);
    expect(isExplicitStagingEnvironment({
      EGRESS_OBSERVATION: '1',
      VERCEL_ENV: 'preview',
      NEXT_PUBLIC_SUPABASE_URL: `http://${APPROVED_TEST_PROJECT_REF}.supabase.co`,
    })).toBe(false);
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

  it('refuses benchmark in unverified production environment and validates request URL origin', async () => {
    // Benchmark refusing NODE_ENV=production without staging indicators
    expect(() => assertEgressBenchmarkAllowed({
      supabaseUrl: TEST_URL,
      nodeEnv: 'production',
    })).toThrow(EgressProductionRefusal);

    // Benchmark accepting NODE_ENV=production when APP_ENV=staging
    expect(() => assertEgressBenchmarkAllowed({
      supabaseUrl: TEST_URL,
      nodeEnv: 'production',
      appEnv: 'staging',
    })).not.toThrow();

    // Rejects off-project request URL in benchmark mode even if configured target is approved
    const inner = vi.fn(async () => jsonResponse([]));
    const fetchImpl = createObservedFetch(inner, {
      enabled: true,
      benchmark: true,
      supabaseUrl: TEST_URL,
    });
    await expect(fetchImpl('https://evil-unapproved.supabase.co/rest/v1/items')).rejects.toBeInstanceOf(EgressProductionRefusal);
    expect(inner).not.toHaveBeenCalled();
  });

  it('fails closed on unknown or unapproved custom environments', () => {
    expect(isExplicitStagingEnvironment({})).toBe(false);

    // Hostinger production host
    expect(isExplicitStagingEnvironment({
      EGRESS_OBSERVATION: '1',
      NODE_ENV: 'production',
      HOST: 'luckystore1947.com',
      NEXT_PUBLIC_SUPABASE_URL: TEST_URL,
    })).toBe(false);

    // Custom unapproved ref is rejected
    expect(isExplicitStagingEnvironment({
      EGRESS_OBSERVATION: '1',
      VERCEL_ENV: 'preview',
      NEXT_PUBLIC_SUPABASE_URL: 'https://custom-unapproved-ref.supabase.co',
      ALLOW_CUSTOM_TEST_SUPABASE_REF: '1',
    })).toBe(false);
  });

  it('creates an internal budget when omitted in benchmark mode and enforces caps', async () => {
    const inner = vi.fn(async () => jsonResponse([1]));
    const fetchImpl = createObservedFetch(inner, {
      enabled: true,
      benchmark: true,
      supabaseUrl: TEST_URL,
    });
    const res = await fetchImpl(`${TEST_URL}/rest/v1/items`);
    expect(res.status).toBe(200);
    expect(inner).toHaveBeenCalledOnce();
  });

  it('wires shared-client options to default observation sink', async () => {
    clearCollectedObservations();
    const options = buildSupabaseClientOptions({
      EGRESS_OBSERVATION: '1',
      NODE_ENV: 'test',
      NEXT_PUBLIC_SUPABASE_URL: TEST_URL,
      EGRESS_DEPLOYMENT_SHA: 'bbdb3428',
    });
    expect(options.global?.fetch).toBeDefined();

    const mockFetch = vi.fn(async () => jsonResponse([{ id: 1 }]));
    const fetchWrapper = createObservedFetch(mockFetch, {
      enabled: true,
      benchmark: false,
      supabaseUrl: TEST_URL,
    });
    await fetchWrapper(`${TEST_URL}/rest/v1/categories`);
    await new Promise((resolve) => setTimeout(resolve, 20));

    const records = getCollectedObservations();
    expect(records.length).toBeGreaterThan(0);
    expect(records[0].operation).toBe('table:categories');
  });

  it('isolates caller context across concurrent asynchronous operations without crosstalk', async () => {
    const runAsyncRoute = async (route: string) => {
      return withCallerContext({ routeFamily: route }, async () => {
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
    expect(getActiveCallerContext()).toEqual({});
  });
});
