import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SocialPostPage } from '@/features/social/SocialPostPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Mock modules
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
    from: vi.fn(),
  },
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn(),
    useMutation: vi.fn(),
    useQueryClient: vi.fn(),
  };
});

vi.mock('@/components/NotificationContext', () => ({
  useNotify: vi.fn(),
}));

vi.mock('@/lib/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotify } from '@/components/NotificationContext';
import { useAuth } from '@/lib/AuthContext';

const mockSupabase = vi.mocked(supabase);
const mockUseQuery = vi.mocked(useQuery);
const mockUseMutation = vi.mocked(useMutation);
const mockUseQueryClient = vi.mocked(useQueryClient);
const mockUseNotify = vi.mocked(useNotify);
const mockUseAuth = vi.mocked(useAuth);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockMutate = vi.fn();
const mockInvalidateQueries = vi.fn();
const mockNotify = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();

  mockUseAuth.mockReturnValue({
    storeId: 'test-store-id',
    user: { role: 'owner', id: 'user-1' },
  });

  mockUseNotify.mockReturnValue({ notify: mockNotify });

  mockUseQueryClient.mockReturnValue({
    invalidateQueries: mockInvalidateQueries,
  });

  mockUseQuery.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });

  mockUseMutation.mockReturnValue({
    mutate: mockMutate,
    isPending: false,
    isSuccess: false,
    isError: false,
  });

  mockSupabase.auth.getSession.mockResolvedValue({
    data: { session: { access_token: 'test-token' } },
    error: null,
  });
});

afterEach(() => {
  vi.resetAllMocks();
});

describe('SocialPostPage', () => {
  it('renders page title and subtitle', () => {
    render(<SocialPostPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Social Post')).toBeInTheDocument();
    expect(screen.getByText('Publish updates to your Facebook page and view post history.')).toBeInTheDocument();
  });

  it('renders composer form when user has permission', () => {
    render(<SocialPostPage />, { wrapper: createWrapper() });

    expect(screen.getByLabelText('Post Content')).toBeInTheDocument();
    expect(screen.getByLabelText('Link (optional)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Publish to Facebook/i })).toBeInTheDocument();
  });

  it('shows permission denied message when user lacks permission', () => {
    mockUseAuth.mockReturnValue({
      storeId: 'test-store-id',
      user: { role: 'cashier', id: 'user-2' },
    });

    render(<SocialPostPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/You do not have permission to publish social posts/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('Post Content')).not.toBeInTheDocument();
  });

  it('shows character count', () => {
    render(<SocialPostPage />, { wrapper: createWrapper() });

    const textarea = screen.getByLabelText('Post Content');
    fireEvent.change(textarea, { target: { value: 'Hello world' } });

    expect(screen.getByText('11 / 5000')).toBeInTheDocument();
  });

  it('disables submit button when content is empty', () => {
    render(<SocialPostPage />, { wrapper: createWrapper() });

    const submitBtn = screen.getByRole('button', { name: /Publish to Facebook/i });
    expect(submitBtn).toBeDisabled();
  });

  it('enables submit button when content is provided', () => {
    render(<SocialPostPage />, { wrapper: createWrapper() });

    const textarea = screen.getByLabelText('Post Content');
    fireEvent.change(textarea, { target: { value: 'Test content' } });

    const submitBtn = screen.getByRole('button', { name: /Publish to Facebook/i });
    expect(submitBtn).not.toBeDisabled();
  });

  it('calls mutate on form submit', async () => {
    render(<SocialPostPage />, { wrapper: createWrapper() });

    const textarea = screen.getByLabelText('Post Content');
    fireEvent.change(textarea, { target: { value: 'Test post content' } });

    const linkInput = screen.getByLabelText('Link (optional)');
    fireEvent.change(linkInput, { target: { value: 'https://example.com' } });

    const submitBtn = screen.getByRole('button', { name: /Publish to Facebook/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({
        text: 'Test post content',
        url: 'https://example.com',
      });
    });
  });

  it('shows success message on successful publish', async () => {
    let onSuccessCallback: () => void;
    
    render(<SocialPostPage />, { wrapper: createWrapper() });

    // Capture the onSuccess callback from the useMutation call after render
    const useMutationCalls = mockUseMutation.mock.calls;
    if (useMutationCalls.length > 0) {
      const mutationOptions = useMutationCalls[useMutationCalls.length - 1][0];
      onSuccessCallback = mutationOptions?.onSuccess;
    }

    const textarea = screen.getByLabelText('Post Content');
    fireEvent.change(textarea, { target: { value: 'Test post content' } });

    const submitBtn = screen.getByRole('button', { name: /Publish to Facebook/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalled();
    });

    // Call the onSuccess callback directly to simulate mutation success
    onSuccessCallback?.();

    await waitFor(() => {
      expect(screen.getByText(/Post published successfully!/i)).toBeInTheDocument();
    });
  });

  it('shows error message on failed publish', async () => {
    let onErrorCallback: (err: Error) => void;
    
    render(<SocialPostPage />, { wrapper: createWrapper() });

    // Capture the onError callback from the useMutation call after render
    const useMutationCalls = mockUseMutation.mock.calls;
    if (useMutationCalls.length > 0) {
      const mutationOptions = useMutationCalls[useMutationCalls.length - 1][0];
      onErrorCallback = mutationOptions?.onError;
    }

    const textarea = screen.getByLabelText('Post Content');
    fireEvent.change(textarea, { target: { value: 'Test post content' } });

    const submitBtn = screen.getByRole('button', { name: /Publish to Facebook/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalled();
    });

    // Call the onError callback directly to simulate mutation failure
    onErrorCallback?.(new Error('Failed to publish post.'));

    await waitFor(() => {
      expect(screen.getByText(/Failed to publish post./i)).toBeInTheDocument();
    });
  });

  it('renders post history section', () => {
    mockUseQuery.mockReturnValue({
      data: [
        {
          id: 'post-1',
          tenant_id: 'tenant-1',
          store_id: 'test-store-id',
          user_id: 'user-1',
          platform: 'facebook',
          content: 'Test post',
          link: 'https://example.com',
          status: 'published' as const,
          post_id: 'fb-post-123',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<SocialPostPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Recent Posts')).toBeInTheDocument();
    expect(screen.getByText('Test post')).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.getByText('https://example.com')).toBeInTheDocument();
  });

  it('renders draft status badge correctly', () => {
    mockUseQuery.mockReturnValue({
      data: [
        {
          id: 'post-1',
          tenant_id: 'tenant-1',
          store_id: 'test-store-id',
          user_id: 'user-1',
          platform: 'facebook',
          content: 'Draft post',
          link: null,
          status: 'draft' as const,
          post_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<SocialPostPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('renders failed status badge correctly', () => {
    mockUseQuery.mockReturnValue({
      data: [
        {
          id: 'post-1',
          tenant_id: 'tenant-1',
          store_id: 'test-store-id',
          user_id: 'user-1',
          platform: 'facebook',
          content: 'Failed post',
          link: null,
          status: 'failed' as const,
          post_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<SocialPostPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('shows loading skeletons while fetching history', () => {
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    });

    render(<SocialPostPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Recent Posts')).toBeInTheDocument();
  });

  it('shows error state when history fetch fails', () => {
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    });

    render(<SocialPostPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Failed to load post history.')).toBeInTheDocument();
  });

  it('shows empty state when no posts exist', () => {
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<SocialPostPage />, { wrapper: createWrapper() });

    expect(screen.getByText('No posts yet.')).toBeInTheDocument();
  });
});