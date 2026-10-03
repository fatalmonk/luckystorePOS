/* eslint-disable no-console */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { autofill, exportDesign, getDataset, uploadAsset } from "./canva-rest";

type WeeklyJob = {
  name: string;
  templateId: string;
  imagePath: string;
  outputName: string;
};

async function main() {
  const token = process.env.CANVA_ACCESS_TOKEN;
  if (!token) throw new Error("CANVA_ACCESS_TOKEN is required");
  const jobs = JSON.parse(
    process.env.CANVA_WEEKLY_JOBS_JSON ?? "[]",
  ) as WeeklyJob[];
  if (!jobs.length)
    throw new Error(
      "CANVA_WEEKLY_JOBS_JSON must contain the approved weekly jobs",
    );
  const outputDir =
    process.env.CANVA_OUTPUT_DIR ?? path.resolve("docs/generated-posts");
  await mkdir(outputDir, { recursive: true });
  for (const job of jobs) {
    const dataset = await getDataset(token, job.templateId);
    const assetId = await uploadAsset(
      token,
      job.imagePath,
      `${job.outputName}-asset`,
    );
    const data =
      "HERO_IMAGE" in dataset.dataset
        ? { HERO_IMAGE: { type: "image", asset_id: assetId } }
        : {};
    const designId = await autofill(token, job.templateId, job.name, data);
    const downloadUrl = await exportDesign(token, designId, "png");
    const response = await fetch(downloadUrl);
    if (!response.ok)
      throw new Error(
        `Unable to download ${job.outputName} (${response.status})`,
      );
    const outputPath = path.join(outputDir, `${job.outputName}.png`);
    await writeFile(outputPath, Buffer.from(await response.arrayBuffer()));
    console.log(`Generated ${outputPath}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
