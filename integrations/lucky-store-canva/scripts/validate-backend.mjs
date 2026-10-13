import process from "node:process";

const configured = process.env.CANVA_BACKEND_HOST;
try {
  const url = new URL(configured ?? "");
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.href.includes("?") ||
    url.href.includes("#")
  ) {
    throw new Error();
  }
} catch {
  process.stderr.write("Set CANVA_BACKEND_HOST to the intended root HTTPS backend URL before building.\n");
  process.exit(1);
}
