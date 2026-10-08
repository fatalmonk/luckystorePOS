import { describe, it, expect } from 'vitest';
import { validateEmail, validatePassword, formatUserData } from './auth';

describe('mobile auth lib', () => {
  it('validates email formats correctly', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('user.name+tag@domain.co.uk')).toBe(true);
    expect(validateEmail('invalid-email')).toBe(false);
    expect(validateEmail('user@')).toBe(false);
    expect(validateEmail('')).toBe(false);
  });

  it('validates password length and composition correctly', () => {
    expect(validatePassword('StrongPass123').valid).toBe(true);
    expect(validatePassword('luckyUser42').valid).toBe(true);
    expect(validatePassword('12345678').valid).toBe(false); // no letters, trivial
    expect(validatePassword('allletterspass').valid).toBe(false); // no numbers
    expect(validatePassword('pass123').valid).toBe(false); // < 8 chars
    expect(validatePassword('password123').valid).toBe(false); // trivial
    expect(validatePassword('').valid).toBe(false);
  });

  it('formats user data correctly from Supabase user object', () => {
    const raw = {
      id: 'usr-123',
      email: 'karim@example.com',
      user_metadata: {
        full_name: 'Karim Ahmed',
        phone: '01712345678',
        address: 'Chittagong',
      },
    };
    const user = formatUserData(raw);
    expect(user.id).toBe('usr-123');
    expect(user.email).toBe('karim@example.com');
    expect(user.name).toBe('Karim Ahmed');
    expect(user.phone).toBe('01712345678');
    expect(user.address).toBe('Chittagong');
  });
});
