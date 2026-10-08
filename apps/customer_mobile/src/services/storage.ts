import * as SecureStore from 'expo-secure-store';

export const GUEST_TOKENS_KEY = 'lucky_guest_order_tokens';
export const AUTH_SESSION_KEY = 'lucky_auth_session';

const memoryFallback: Record<string, string> = {};

export async function setSecureItem(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    memoryFallback[key] = value;
  }
}

export async function getSecureItem(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return memoryFallback[key] || null;
  }
}

export async function removeSecureItem(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    delete memoryFallback[key];
  }
}

export async function saveGuestOrderToken(orderNumber: string, token: string): Promise<void> {
  if (!orderNumber || !token) return;
  try {
    const raw = await getSecureItem(GUEST_TOKENS_KEY);
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};
    map[orderNumber.toUpperCase()] = token;
    await setSecureItem(GUEST_TOKENS_KEY, JSON.stringify(map));
  } catch {
    // Non-fatal
  }
}

export async function getGuestOrderToken(orderNumber: string): Promise<string | null> {
  if (!orderNumber) return null;
  try {
    const raw = await getSecureItem(GUEST_TOKENS_KEY);
    if (!raw) return null;
    const map: Record<string, string> = JSON.parse(raw);
    return map[orderNumber.toUpperCase()] || null;
  } catch {
    return null;
  }
}
