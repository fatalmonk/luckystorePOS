import {
  assertLegacyCsvLineLimit,
  MAX_IMPORT_REQUEST_BYTES,
  MAX_IMAGE_BYTES,
  ImportRequestLimitError,
  readBoundedRequest,
} from "./request_limits.ts";
import { MAX_IMAGE_BYTES as SHARED_MAX_IMAGE_BYTES } from "../_shared/webp.ts";

Deno.test("import request budget covers maximum CSV and image payloads with multipart overhead", () => {
  if (MAX_IMPORT_REQUEST_BYTES < 10 * 1024 * 1024 + 16 * 1024 * 1024) {
    throw new Error("request cap does not cover configured CSV and image payload limits");
  }
  if (MAX_IMAGE_BYTES !== SHARED_MAX_IMAGE_BYTES) {
    throw new Error("import image cap diverged from shared WebP image limit");
  }
});

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
