import { auth } from "@canva/user";

const backendHost = typeof BACKEND_HOST === "string" ? BACKEND_HOST : "";

export async function canvaApiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  let baseUrl: URL;
  try {
    baseUrl = new URL(backendHost);
  } catch {
    throw new Error("BACKEND_HOST must be an HTTPS URL");
  }
  if (
    baseUrl.protocol !== "https:" ||
    baseUrl.username ||
    baseUrl.password ||
    baseUrl.search ||
    baseUrl.hash ||
    baseUrl.href.includes("?") ||
    baseUrl.href.includes("#")
  ) {
    throw new Error("BACKEND_HOST must be an HTTPS URL without credentials");
  }
  const base = baseUrl.toString().replace(/\/+$/, "");
  const token = await auth.getCanvaUserToken();
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers,
  });
  if (!response.ok)
    throw new Error(
      (await response.text()) || `Request failed (${response.status})`,
    );
  return response.json() as Promise<T>;
}
