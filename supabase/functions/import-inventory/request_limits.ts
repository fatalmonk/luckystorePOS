import { MAX_IMAGE_BYTES } from "../_shared/webp.ts";

// Covers the 10 MiB CSV cap, 16 MiB aggregate image cap, plus multipart overhead.
export const MAX_IMPORT_REQUEST_BYTES = 32 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 1_000;
export const MAX_IMAGE_ATTACHMENTS = 5;
export const MAX_TOTAL_IMAGE_BYTES = 16 * 1024 * 1024;
export { MAX_IMAGE_BYTES };
export const MAX_LEGACY_CSV_BYTES = 10 * 1024 * 1024;
export const MAX_LEGACY_CSV_ROWS = 10_000;
export const MAX_LEGACY_CSV_LINES = 20_000;

export class ImportRequestLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportRequestLimitError";
  }
}

export async function readBoundedRequest(
  request: Request,
  maxBytes = MAX_IMPORT_REQUEST_BYTES,
): Promise<Request> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new ImportRequestLimitError(
      "Import request exceeds the maximum allowed size",
    );
  }
  if (!request.body) return request;

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new ImportRequestLimitError(
        "Import request exceeds the maximum allowed size",
      );
    }
    chunks.push(value);
  }

  const headers = new Headers(request.headers);
  headers.delete("content-length");
  headers.delete("transfer-encoding");
  return new Request(request.url, {
    method: request.method,
    headers,
    body: new Blob(chunks as unknown as BlobPart[]),
  });
}

export function assertLegacyCsvLineLimit(text: string): void {
  let lineCount = 1;
  for (const character of text) {
    if (character === "\n" && ++lineCount > MAX_LEGACY_CSV_LINES) {
      throw new ImportRequestLimitError(
        `CSV import exceeds the maximum physical line count of ${MAX_LEGACY_CSV_LINES}`,
      );
    }
  }
}
