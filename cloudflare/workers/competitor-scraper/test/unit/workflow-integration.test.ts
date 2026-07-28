import { describe, expect, it, vi } from "vitest";
import {
  CompetitorScrapeWorkflow,
  type WorkflowParams,
} from "../../src/workflow.ts";
import { CHALDAL_FIXTURE, SHWAPNO_FIXTURE } from "../fixtures/pages.ts";
import { createFakeBrowser } from "../fakes/browser.ts";
import { createFakeSupabaseClient } from "../fakes/supabase.ts";
import type { Env as LocalEnv } from "../../src/index.ts";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";

const ctx = {} as unknown as ExecutionContext;

type TestEnv = LocalEnv & Record<string, unknown>;

const env: TestEnv = {
  BROWSER: {} as unknown as Fetcher,
  COMPETITOR_SCRAPE_WORKFLOW: {} as unknown as Workflow<WorkflowParams>,
  SUPABASE_URL: "https://example.invalid",
  SUPABASE_SERVICE_ROLE_KEY: "fake",
  SUPABASE_CLIENT: createFakeSupabaseClient({
    inventory: [
      { id: "item-1", name: "Pran Potato Crackers 50 gm", sku: "sku-1" },
      { id: "item-2", name: "Nestle Maggi Noodles 4 Pack", sku: "sku-2" },
    ],
  }),
  AUTOMATION_ENABLED: "true",
  WORKFLOW_VERSION: "competitor-scrape-v1",
  STORE_ALLOWLIST: JSON.stringify([
    "11111111-1111-4111-8111-111111111111",
    "22222222-2222-4222-8222-222222222222",
  ]),
  CHALDAL_SOURCE_APPROVED: "true",
  SHWAPNO_SOURCE_APPROVED: "true",
};

function makeEvent(): Readonly<WorkflowEvent<WorkflowParams>> {
  return {
    payload: { scheduledAt: "2026-07-29T21:00:00.000Z" },
    timestamp: new Date("2026-07-29T21:00:00.000Z").getTime(),
    schedule: { scheduledTime: "2026-07-29T21:00:00.000Z" },
  } as unknown as Readonly<WorkflowEvent<WorkflowParams>>;
}

function createWorkflow(
  html: Map<string, string>,
  options?: { launchFailureCount?: number },
): CompetitorScrapeWorkflow {
  const fakeEnv: TestEnv = {
    ...env,
    BROWSER: createFakeBrowser(html, options) as unknown as Fetcher,
  };
  // Cloudflare WorkflowEntrypoint constructor signature is (ctx, env) at runtime.
  return new (CompetitorScrapeWorkflow as unknown as new (
    ctx: ExecutionContext,
    env: TestEnv,
  ) => CompetitorScrapeWorkflow)(ctx, fakeEnv);
}

describe("workflow integration", () => {
  it("scrapes each approved source once and matches across all allowlisted stores", async () => {
    const calls: string[] = [];
    const step = {
      do: vi.fn(async (name: string, _options: unknown, fn: () => Promise<unknown>) => {
        calls.push(name);
        return fn();
      }),
    };
    const html = new Map([
      ["https://chaldal.com/fresh-vegetable", CHALDAL_FIXTURE],
      ["https://www.shwapno.com/eggs", SHWAPNO_FIXTURE],
    ]);
    const workflow = createWorkflow(html);

    const result = await workflow.run(makeEvent(), step as unknown as WorkflowStep);

    expect(result.found).toBeGreaterThan(0);
    expect(result.matched).toBeGreaterThan(0);
    expect(result.failed).toBe(0);
    expect(calls.filter((c) => c.startsWith("scrape-")).length).toBe(2);
    expect(calls.filter((c) => c.startsWith("match-and-ingest-chaldal-store-")).length).toBe(2);
    expect(calls.filter((c) => c.startsWith("match-and-ingest-shwapno-store-")).length).toBe(2);
    expect(result.competitors.chaldal.error).toBeNull();
    expect(result.competitors.shwapno.error).toBeNull();
  });

  it("retries a failing source and continues when it succeeds", async () => {
    const attempts = new Map<string, number>();
    const step = {
      do: vi.fn(async (name: string, options: unknown, fn: () => Promise<unknown>) => {
        const retryOptions = (options as { retries?: { limit?: number } })?.retries;
        const maxAttempts = retryOptions?.limit ? retryOptions.limit + 1 : 1;
        let lastError: Error | undefined;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const current = attempts.get(name) ?? 0;
          attempts.set(name, current + 1);
          try {
            if (name === "scrape-chaldal" && current < 2) {
              throw new Error(`simulated chaldal failure attempt ${current + 1}`);
            }
            return await fn();
          } catch (err) {
            lastError = err as Error;
            if (attempt < maxAttempts - 1) {
              continue;
            }
            throw lastError;
          }
        }
        throw lastError ?? new Error("unknown error");
      }),
    };
    const html = new Map([
      ["https://chaldal.com/fresh-vegetable", CHALDAL_FIXTURE],
      ["https://www.shwapno.com/eggs", SHWAPNO_FIXTURE],
    ]);
    const workflow = createWorkflow(html);

    const result = await workflow.run(makeEvent(), step as unknown as WorkflowStep);

    expect(result.failed).toBe(0);
    expect(result.competitors.chaldal.found).toBeGreaterThan(0);
    expect(result.competitors.shwapno.found).toBeGreaterThan(0);
    expect(attempts.get("scrape-chaldal")).toBeGreaterThanOrEqual(2);
    expect(attempts.get("scrape-shwapno")).toBe(1);
  });

  it("records a failed source after retry exhaustion and continues with the other source", async () => {
    const attempts = new Map<string, number>();
    const step = {
      do: vi.fn(async (name: string, _options: unknown, fn: () => Promise<unknown>) => {
        const current = attempts.get(name) ?? 0;
        attempts.set(name, current + 1);
        if (name === "scrape-chaldal") {
          throw new Error("chaldal permanently down");
        }
        return fn();
      }),
    };
    const html = new Map([["https://www.shwapno.com/eggs", SHWAPNO_FIXTURE]]);
    const workflow = createWorkflow(html);

    const result = await workflow.run(makeEvent(), step as unknown as WorkflowStep);

    expect(result.competitors.chaldal.failed).toBeGreaterThan(0);
    expect(result.competitors.chaldal.error).toContain("permanently down");
    expect(result.competitors.shwapno.found).toBeGreaterThan(0);
    expect(result.competitors.shwapno.error).toBeNull();
  });

  it("does not retry successful sources", async () => {
    const step = {
      do: vi.fn(async (_name: string, _options: unknown, fn: () => Promise<unknown>) => fn()),
    };
    const html = new Map([
      ["https://chaldal.com/fresh-vegetable", CHALDAL_FIXTURE],
      ["https://www.shwapno.com/eggs", SHWAPNO_FIXTURE],
    ]);
    const workflow = createWorkflow(html);

    await workflow.run(makeEvent(), step as unknown as WorkflowStep);

    const scrapeCalls = step.do.mock.calls.filter((call: unknown[]) =>
      String(call[0]).startsWith("scrape-"),
    );
    expect(scrapeCalls.length).toBe(2);
  });

  it("closes browser after failed source attempts", async () => {
    const browser = createFakeBrowser(new Map(), { launchFailureCount: 1 });
    const fakeEnv: TestEnv = {
      ...env,
      BROWSER: browser as unknown as Fetcher,
    };
    const workflow = new (CompetitorScrapeWorkflow as unknown as new (
      ctx: ExecutionContext,
      env: TestEnv,
    ) => CompetitorScrapeWorkflow)(ctx, fakeEnv);
    const step = {
      do: vi.fn(async (_name: string, _options: unknown, fn: () => Promise<unknown>) => fn()),
    };

    await workflow.run(makeEvent(), step as unknown as WorkflowStep);

    expect(browser.state.browserClosed).toBe(true);
    expect(browser.state.pageClosed).toBe(true);
  });
});
