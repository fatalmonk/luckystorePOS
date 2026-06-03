import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface OptimisticMutationOptions<TData, TError, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  queryKey: string[];
  onError?: (error: TError, variables: TVariables) => void;
  onSuccess?: (data: TData, variables: TVariables) => void;
  /** Function to optimistically update the cache */
  optimisticUpdater: (oldData: any, variables: TVariables) => any;
}

/**
 * Hook for optimistic mutations that updates UI immediately
 * and rolls back on error.
 */
export function useOptimisticMutation<TData = unknown, TError = Error, TVariables = unknown>(
  options: OptimisticMutationOptions<TData, TError, TVariables>
) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<TError | null>(null);

  const mutation = useMutation({
    mutationFn: options.mutationFn,
    onMutate: async (variables) => {
      setError(null);
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: options.queryKey });
      
      // Snapshot previous value
      const previousData = queryClient.getQueryData(options.queryKey);
      
      // Optimistically update
      queryClient.setQueryData(options.queryKey, (old) => {
        return options.optimisticUpdater(old, variables);
      });
      
      // Return context for rollback
      return { previousData };
    },
    onError: (err: TError, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(options.queryKey, context.previousData);
      }
      setError(err);
      options.onError?.(err, variables);
    },
    onSuccess: (data, variables) => {
      options.onSuccess?.(data, variables);
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: options.queryKey });
    },
  });

  return {
    ...mutation,
    error,
    clearError: () => setError(null),
  };
}

/**
 * Helper to update a specific item in an array optimistically
 */
export function updateArrayItem<T extends { id: string }>(
  array: T[] | undefined,
  id: string,
  updater: (item: T) => T
): T[] | undefined {
  if (!array) return array;
  return array.map((item) => (item.id === id ? updater(item) : item));
}
