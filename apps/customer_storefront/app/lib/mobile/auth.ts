export interface MobileUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  address?: string;
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

export function formatUserData(supabaseUser: any): MobileUser {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    name:
      supabaseUser.user_metadata?.full_name ||
      supabaseUser.user_metadata?.name ||
      supabaseUser.email?.split('@')[0] ||
      'Customer',
    phone: supabaseUser.user_metadata?.phone || undefined,
    address: supabaseUser.user_metadata?.address || undefined,
  };
}
