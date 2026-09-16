const PRODUCTION_SUPABASE_PROJECT_REF = 'hvmyxyccfnkrbxqbhlnm';
const APPROVED_TEST_SUPABASE_PROJECT_REF = 'grxxenvdhfwzafzyykgo';

interface MutationEnvironment {
  E2E_CAN_MUTATE?: string;
  E2E_SUPABASE_PROJECT_REF?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
}

export interface MutationSafety {
  allowed: boolean;
  requested: boolean;
  reason: string;
}

function projectRefFromUrl(rawUrl: string | undefined): string | null {
  if (!rawUrl) return null;

  try {
    return new URL(rawUrl).hostname.split('.')[0] || null;
  } catch {
    return null;
  }
}

export function getMutationSafety(env: MutationEnvironment = {
  E2E_CAN_MUTATE: process.env.E2E_CAN_MUTATE,
  E2E_SUPABASE_PROJECT_REF: process.env.E2E_SUPABASE_PROJECT_REF,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
}): MutationSafety {
  const requested = env.E2E_CAN_MUTATE === 'true';
  if (!requested) {
    return { allowed: false, requested, reason: 'E2E_CAN_MUTATE is not enabled' };
  }

  const configuredRef = projectRefFromUrl(env.NEXT_PUBLIC_SUPABASE_URL);
  const expectedTestRef = env.E2E_SUPABASE_PROJECT_REF?.trim() || null;

  if (!configuredRef || !expectedTestRef) {
    return {
      allowed: false,
      requested,
      reason: 'Mutation requires both a valid Supabase URL and E2E_SUPABASE_PROJECT_REF',
    };
  }

  if (
    configuredRef === PRODUCTION_SUPABASE_PROJECT_REF ||
    expectedTestRef === PRODUCTION_SUPABASE_PROJECT_REF
  ) {
    return { allowed: false, requested, reason: 'Mutation against production Supabase is forbidden' };
  }

  if (configuredRef !== expectedTestRef) {
    return {
      allowed: false,
      requested,
      reason: 'Configured Supabase URL does not match the declared test project ref',
    };
  }

  return { allowed: true, requested, reason: 'Verified isolated Supabase test project' };
}
