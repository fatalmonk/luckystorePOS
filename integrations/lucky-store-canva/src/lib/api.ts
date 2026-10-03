import { auth } from "@canva/user";

const backendHost = typeof BACKEND_HOST === "string" ? BACKEND_HOST : "";

export async function canvaApiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await auth.getCanvaUserToken();
  const response = await fetch(`${backendHost}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });
  if (!response.ok)
    throw new Error(
      (await response.text()) || `Request failed (${response.status})`,
    );
  return response.json() as Promise<T>;
}
