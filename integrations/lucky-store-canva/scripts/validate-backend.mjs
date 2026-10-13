const configured = process.env.CANVA_BACKEND_HOST;
try {
  const url = new URL(configured ?? "");
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error();
  }
} catch {
  console.error("Set CANVA_BACKEND_HOST to the intended HTTPS backend before building.");
  process.exit(1);
}
