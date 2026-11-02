import {
  assertLegacyCsvLineLimit,
  ImportRequestLimitError,
  readBoundedRequest,
} from "./request_limits.ts";

Deno.test("bounded request accepts a body at the configured limit", async () => {
  const request = new Request("https://example.test/import", {
    method: "POST",
    body: "1234",
  });
  const bounded = await readBoundedRequest(request, 4);
  if (await bounded.text() !== "1234") {
    throw new Error("bounded request body changed");
  }
});

Deno.test("bounded request rejects oversized streamed bodies", async () => {
  const request = new Request("https://example.test/import", {
    method: "POST",
    body: "12345",
  });
  let rejected = false;
  try {
    await readBoundedRequest(request, 4);
  } catch (error) {
    rejected = error instanceof ImportRequestLimitError;
  }
  if (!rejected) throw new Error("oversized request was accepted");
});

Deno.test("bounded request rejects an oversized declared content length before reading", async () => {
  const request = new Request("https://example.test/import", {
    method: "POST",
    headers: { "content-length": "5" },
    body: "1234",
  });
  let rejected = false;
  try {
    await readBoundedRequest(request, 4);
  } catch (error) {
    rejected = error instanceof ImportRequestLimitError;
  }
  if (!rejected) throw new Error("oversized declared request was accepted");
});

Deno.test("legacy CSV line cap rejects huge physical-line counts before parsing", () => {
  let rejected = false;
  try {
    assertLegacyCsvLineLimit("\n".repeat(20_000));
  } catch (error) {
    rejected = error instanceof ImportRequestLimitError;
  }
  if (!rejected) throw new Error("oversized CSV line count was accepted");
});
