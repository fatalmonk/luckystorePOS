import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export const GUEST_TOKENS_KEY = 'lucky_guest_order_tokens';
export const AUTH_SESSION_KEY = 'lucky_auth_session';
export const CART_ITEMS_KEY = 'lucky_cart_items';
export const WISHLIST_ITEMS_KEY = 'lucky_wishlist_items';

const memoryFallback: Record<string, string> = {};

/**
 * General key-value storage for non-sensitive data (cart items, wishlist, preferences).
 * Uses AsyncStorage to support arbitrary JSON payloads without iOS Keychain 2048-byte limits.
 */
export async function setItem(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (err) {
    memoryFallback[key] = value;
    console.error(`[storage] Failed to setItem for key "${key}":`, err);
  }
}

export async function getItem(key: string): Promise<string | null> {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value !== null) return value;
  } catch (err) {
    console.warn(`[storage] AsyncStorage.getItem failed for "${key}":`, err);
  }

  // Check memory fallback
  if (memoryFallback[key]) return memoryFallback[key];

  // Migration fallback: check legacy SecureStore in case user had saved data
  try {
    const legacy = await SecureStore.getItemAsync(key);
    if (legacy !== null) {
      // Migrate to AsyncStorage silently
      await AsyncStorage.setItem(key, legacy).catch(() => {});
      await SecureStore.deleteItemAsync(key).catch(() => {});
      return legacy;
    }
  } catch {
    // Ignore legacy read errors
  }

  return null;
}

export async function removeItem(key: string): Promise<void> {
  delete memoryFallback[key];
  try {
    await AsyncStorage.removeItem(key);
  } catch (err) {
    console.warn(`[storage] AsyncStorage.removeItem failed for "${key}":`, err);
  }
}

/**
 * Secure key-value storage for sensitive credentials (auth tokens, guest order tokens).
 */
export async function setSecureItem(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (err) {
    memoryFallback[key] = value;
    console.error(`[storage] SecureStore write failed for key "${key}":`, err);
  }
}

export async function getSecureItem(key: string): Promise<string | null> {
  try {
    const item = await SecureStore.getItemAsync(key);
    if (item !== null) return item;
  } catch (err) {
    console.warn(`[storage] SecureStore read failed for key "${key}":`, err);
  }
  return memoryFallback[key] || null;
}

export async function removeSecureItem(key: string): Promise<void> {
  delete memoryFallback[key];
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (err) {
    console.warn(`[storage] SecureStore delete failed for key "${key}":`, err);
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
