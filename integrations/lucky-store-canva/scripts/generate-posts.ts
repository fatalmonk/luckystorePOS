/* eslint-disable no-console */
import { writeFile } from "node:fs/promises";
import { autofill, exportDesign, getDataset } from "./canva-rest";

type Job = {
  templateId: string;
  title: string;
  data: Record<string, unknown>;
  outputPath: string;
};

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function main() {
  const token = required("CANVA_ACCESS_TOKEN");
  const jobs = JSON.parse(required("CANVA_AUTOFILL_JOBS_JSON")) as Job[];
  if (!Array.isArray(jobs) || jobs.length === 0)
    throw new Error("CANVA_AUTOFILL_JOBS_JSON must contain at least one job");
  for (const job of jobs) {
    const dataset = await getDataset(token, job.templateId);
    const data = Object.fromEntries(
      Object.entries(job.data).filter(([field]) => field in dataset.dataset),
    );
    const designId = await autofill(token, job.templateId, job.title, data);
    const downloadUrl = await exportDesign(token, designId, "png");
    const response = await fetch(downloadUrl);
    if (!response.ok)
      throw new Error(`Unable to download Canva export (${response.status})`);
    await writeFile(job.outputPath, Buffer.from(await response.arrayBuffer()));
    console.log(`Generated ${job.outputPath}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
