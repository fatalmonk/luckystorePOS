import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateEmail,
  validatePassword,
  UserSchema,
  AuthSuccessSchema,
} from './auth';

describe('mobile auth service', () => {
  it('validates email format correctly', () => {
    assert.strictEqual(validateEmail('user@luckystore.com'), true);
    assert.strictEqual(validateEmail('customer+tag@gmail.com'), true);
    assert.strictEqual(validateEmail('invalid'), false);
    assert.strictEqual(validateEmail('@domain.com'), false);
    assert.strictEqual(validateEmail(''), false);
  });

  it('validates minimum password requirement', () => {
    assert.strictEqual(validatePassword('StrongPass123').valid, true);
    assert.strictEqual(validatePassword('luckyUser42').valid, true);
    assert.strictEqual(validatePassword('12345678').valid, false); // no letters, trivial
    assert.strictEqual(validatePassword('allletterspass').valid, false); // no numbers
    assert.strictEqual(validatePassword('pass123').valid, false); // < 8 chars
    assert.strictEqual(validatePassword('password123').valid, false); // trivial
    assert.strictEqual(validatePassword('').valid, false);
  });

  it('parses valid User object', () => {
    const user = UserSchema.parse({
      id: 'usr-1',
      email: 'user@luckystore.com',
      name: 'Rahim',
    });
    assert.strictEqual(user.id, 'usr-1');
  });

  it('parses valid AuthSuccess response', () => {
    const raw = {
      ok: true,
      user: {
        id: 'usr-456',
        email: 'test@example.com',
        name: 'Test Customer',
        phone: '01712345678',
      },
      token: 'jwt-access-token-123',
    };

    const parsed = AuthSuccessSchema.parse(raw);
    assert.strictEqual(parsed.ok, true);
    assert.strictEqual(parsed.user.name, 'Test Customer');
    assert.strictEqual(parsed.token, 'jwt-access-token-123');
  });
});
