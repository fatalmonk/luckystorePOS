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

  it('allows mutation only for a matching non-production preview ref', () => {
    const result = getMutationSafety({
      E2E_CAN_MUTATE: 'true',
      E2E_SUPABASE_PROJECT_REF: 'preview-branch-ref',
      NEXT_PUBLIC_SUPABASE_URL: 'https://preview-branch-ref.supabase.co',
    });

    expect(result).toMatchObject({ allowed: true, requested: true });
  });
});
