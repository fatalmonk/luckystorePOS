import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "cloudflare:workers": path.resolve(__dirname, "test/fakes/cloudflare-workers.ts"),
      "@cloudflare/puppeteer": path.resolve(__dirname, "test/fakes/cloudflare-puppeteer.ts"),
    },
  },
});
