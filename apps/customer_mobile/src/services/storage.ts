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
  delete memoryFallback[key];
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Already removed from memoryFallback
  }
}

const MAX_GUEST_TOKENS = 25;

function guestOrderKey(orderNumber: string): string {
  return `lucky_guest_token_${orderNumber.toUpperCase().replace(/[^A-Z0-9_-]/g, '_')}`;
}

export async function saveGuestOrderToken(orderNumber: string, token: string): Promise<void> {
  if (!orderNumber || !token) return;
  const cleanNum = orderNumber.trim().toUpperCase();

  // 1. Store individual order key (bounded size, independent of map limit)
  try {
    await setSecureItem(guestOrderKey(cleanNum), token);
  } catch {
    // Non-fatal
  }

  // 2. Also keep a pruned map of recent guest orders (max 25 entries)
  try {
    const raw = await getSecureItem(GUEST_TOKENS_KEY);
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};
    map[cleanNum] = token;

    const keys = Object.keys(map);
    if (keys.length > MAX_GUEST_TOKENS) {
      const pruned: Record<string, string> = {};
      const keepKeys = keys.slice(keys.length - MAX_GUEST_TOKENS);
      for (const k of keepKeys) {
        pruned[k] = map[k];
      }
      await setSecureItem(GUEST_TOKENS_KEY, JSON.stringify(pruned));
    } else {
      await setSecureItem(GUEST_TOKENS_KEY, JSON.stringify(map));
    }
  } catch {
    // Non-fatal fallback
  }
}

export async function getGuestOrderToken(orderNumber: string): Promise<string | null> {
  if (!orderNumber) return null;
  const cleanNum = orderNumber.trim().toUpperCase();

  // Try individual key first
  try {
    const direct = await getSecureItem(guestOrderKey(cleanNum));
    if (direct) return direct;
  } catch {
    // Fall back to map
  }

  // Fallback to pruned map
  try {
    const raw = await getSecureItem(GUEST_TOKENS_KEY);
    if (!raw) return null;
    const map: Record<string, string> = JSON.parse(raw);
    return map[cleanNum] || null;
  } catch {
    return null;
  }
}
