import '@testing-library/jest-dom';
import { vi } from 'vitest';

// import.meta.env test values are defined in vitest.config.ts.

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
        error: null,
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

// Mock React Query
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
}));

// Mock NotificationContext
vi.mock('@/components/NotificationContext', () => ({
  useNotify: vi.fn(() => vi.fn()),
}));

// Mock AuthContext
vi.mock('@/lib/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    storeId: 'test-store-id',
    user: { role: 'owner' },
  })),
}));
