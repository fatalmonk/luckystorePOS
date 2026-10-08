import { z } from 'zod';
import { resolveApiBaseUrl } from './home';

export const UserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export const AuthSuccessSchema = z.object({
  ok: z.literal(true),
  user: UserSchema,
  token: z.string().optional(),
  refreshToken: z.string().optional(),
  requiresEmailConfirmation: z.boolean().optional(),
});

export const AuthErrorSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
});

export type User = z.infer<typeof UserSchema>;

export interface LoginParams {
  email: string;
  password: string;
}

export interface SignupParams {
  name: string;
  phone?: string;
  email: string;
  password: string;
}

export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

const TRIVIAL_PASSWORDS = new Set([
  '12345678',
  '123456789',
  'password',
  'password1',
  'password123',
  'admin123',
  'qwerty123',
  '11111111',
  '87654321',
  'luckystore123',
]);

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain both letters and numbers' };
  }
  if (TRIVIAL_PASSWORDS.has(password.toLowerCase())) {
    return { valid: false, error: 'Password is too common or easily guessed' };
  }
  return { valid: true };
}

export async function loginUser(params: LoginParams, signal?: AbortSignal) {
  const baseUrl = resolveApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/mobile/v1/auth/login`, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(params),
  });

  const data = await response.json();
  if (response.ok && data.ok) {
    return AuthSuccessSchema.parse(data);
  }
  throw new Error(data.error || 'Invalid email or password');
}

export async function signupUser(params: SignupParams, signal?: AbortSignal) {
  const baseUrl = resolveApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/mobile/v1/auth/signup`, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(params),
  });

  const data = await response.json();
  if (response.ok && data.ok) {
    return AuthSuccessSchema.parse(data);
  }
  throw new Error(data.error || 'Failed to create account');
}
