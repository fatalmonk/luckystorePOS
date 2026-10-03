import { readFile } from "node:fs/promises";

const API = process.env.CANVA_API_URL ?? "https://api.canva.com/rest/v1";
const timeoutMs = Number(process.env.CANVA_JOB_TIMEOUT_MS ?? 120_000);
type JobResponse = {
  job?: {
    id?: string;
    status?: string;
    result?: {
      design?: { id?: string };
      asset?: { id?: string };
      urls?: string[];
    };
    urls?: string[];
  };
};

function authHeaders(token: string, extra: Record<string, string> = {}) {
  return { Authorization: `Bearer ${token}`, ...extra };
}

async function json<T>(
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { ...authHeaders(token), ...init.headers },
  });
  if (!response.ok)
    throw new Error(`Canva API ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

async function poll(token: string, path: string) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const result = await json<JobResponse>(token, path);
    const job = result.job;
    if (!job) throw new Error("Canva response did not include a job");
    if (job.status === "success" || job.status === "completed") return job;
    if (job.status === "failed")
      throw new Error("Canva asynchronous job failed");
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error(`Canva job timed out after ${timeoutMs}ms`);
}

export async function getDataset(token: string, templateId: string) {
  return json<{ dataset: Record<string, { type: string }> }>(
    token,
    `/brand-templates/${encodeURIComponent(templateId)}/dataset`,
  );
}

export async function uploadAsset(
  token: string,
  filePath: string,
  name: string,
) {
  const created = await json<JobResponse>(token, "/asset-uploads", {
    method: "POST",
    headers: authHeaders(token, {
      "Content-Type": "application/octet-stream",
      "Asset-Upload-Metadata": JSON.stringify({
        name_base64: Buffer.from(name).toString("base64"),
      }),
    }),
    body: await readFile(filePath),
  });
  const id = created.job?.id;
  if (!id) throw new Error("Canva asset upload did not return a job id");
  const assetId = (
    await poll(token, `/asset-uploads/${encodeURIComponent(id)}`)
  ).result?.asset?.id;
  if (!assetId)
    throw new Error("Canva asset upload did not return an asset id");
  return assetId;
}

export async function autofill(
  token: string,
  templateId: string,
  title: string,
  data: Record<string, unknown>,
) {
  const created = await json<JobResponse>(token, "/autofills", {
    method: "POST",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({
      type: "create_from_brand_template",
      brand_template_id: templateId,
      title,
      data,
    }),
  });
  const id = created.job?.id;
  if (!id) throw new Error("Canva autofill did not return a job id");
  const designId = (await poll(token, `/autofills/${encodeURIComponent(id)}`))
    .result?.design?.id;
  if (!designId) throw new Error("Canva autofill did not return a design id");
  return designId;
}

export async function exportDesign(
  token: string,
  designId: string,
  format: "png" | "jpg" = "png",
) {
  const created = await json<JobResponse>(token, "/exports", {
    method: "POST",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({ design_id: designId, format }),
  });
  const id = created.job?.id;
  if (!id) throw new Error("Canva export did not return a job id");
  const url = (await poll(token, `/exports/${encodeURIComponent(id)}`))
    .urls?.[0];
  if (!url) throw new Error("Canva export did not return a download URL");
  return url;
}
