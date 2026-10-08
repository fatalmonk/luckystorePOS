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

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters' };
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
