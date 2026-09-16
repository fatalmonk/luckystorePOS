import { describe, expect, it } from 'vitest';
import { getMutationSafety } from '../../../e2e/support/mutationSafety';

describe('E2E mutation safety', () => {
  it('does not allow mutation by default', () => {
    expect(getMutationSafety({})).toMatchObject({ allowed: false, requested: false });
  });

  it('refuses mutation against the production Supabase project', () => {
    const result = getMutationSafety({
      E2E_CAN_MUTATE: 'true',
      E2E_SUPABASE_PROJECT_REF: 'hvmyxyccfnkrbxqbhlnm',
      NEXT_PUBLIC_SUPABASE_URL: 'https://hvmyxyccfnkrbxqbhlnm.supabase.co',
    });

    expect(result).toMatchObject({
      allowed: false,
      requested: true,
      reason: 'Mutation against production Supabase is forbidden',
    });
  });

  it('refuses mutation when the URL and declared preview ref differ', () => {
    const result = getMutationSafety({
      E2E_CAN_MUTATE: 'true',
      E2E_SUPABASE_PROJECT_REF: 'preview-a',
      NEXT_PUBLIC_SUPABASE_URL: 'https://preview-b.supabase.co',
    });

    expect(result.allowed).toBe(false);
  });

  it('allows mutation only for the approved test ref', () => {
    const result = getMutationSafety({
      E2E_CAN_MUTATE: 'true',
      E2E_SUPABASE_PROJECT_REF: 'grxxenvdhfwzafzyykgo',
      NEXT_PUBLIC_SUPABASE_URL: 'https://grxxenvdhfwzafzyykgo.supabase.co',
    });

    expect(result).toMatchObject({ allowed: true, requested: true });
  });

  it('refuses mutation against an unapproved non-production ref', () => {
    const result = getMutationSafety({
      E2E_CAN_MUTATE: 'true',
      E2E_SUPABASE_PROJECT_REF: 'other-test-ref',
      NEXT_PUBLIC_SUPABASE_URL: 'https://other-test-ref.supabase.co',
    });

    expect(result.allowed).toBe(false);
  });

  it('refuses an approved ref on a non-Supabase host', () => {
    const result = getMutationSafety({
      E2E_CAN_MUTATE: 'true',
      E2E_SUPABASE_PROJECT_REF: 'grxxenvdhfwzafzyykgo',
      NEXT_PUBLIC_SUPABASE_URL: 'https://grxxenvdhfwzafzyykgo.example.test',
    });

    expect(result.allowed).toBe(false);
  });
});
