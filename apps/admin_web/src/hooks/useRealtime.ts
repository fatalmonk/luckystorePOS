import { useEffect, useRef } from 'react';
import { supabase } from "@/lib/supabase";
import { useQueryClient } from '@tanstack/react-query';

type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface RealtimeSubscriptionOptions {
  /** Supabase table name */
  table: string;
  /** Which events to listen to */
  event?: RealtimeEventType;
  /** Optional filter, e.g. `store_id=eq.xxx` */
  filter?: string;
  /** Which React Query keys to invalidate when a change is received */
  invalidateKeys?: unknown[][];
  /** Optional callback for custom handling */
  onEvent?: (payload: Record<string, unknown>) => void;
}

export function useRealtimeSubscription({
  table,
  event = '*',
  filter,
  invalidateKeys = [],
  onEvent,
}: RealtimeSubscriptionOptions) {
  const queryClient = useQueryClient();
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    const channelName = `realtime-${table}-${event}-${filter ?? 'all'}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: event as 'INSERT' | 'UPDATE' | 'DELETE' | '*', schema: 'public', table: table, filter: filter as string | undefined },
        (payload: Record<string, unknown>) => {
          onEventRef.current?.(payload);

          for (const keys of invalidateKeys) {
            queryClient.invalidateQueries({ queryKey: keys });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, event, filter, invalidateKeys, queryClient]);
}
