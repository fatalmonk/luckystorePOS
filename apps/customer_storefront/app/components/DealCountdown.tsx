'use client';

import React, { useState, useEffect, useCallback } from 'react';

export interface DealTimeResponse {
  endTime: string;
  serverTime?: string;
  dealTitle?: string;
}

export interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

export interface DealCountdownProps {
  workerUrl?: string;
  initialEndTime?: string;
  className?: string;
  onExpire?: () => void;
}

/**
 * Calculates time remaining until a given target date ISO string.
 */
function calculateTimeLeft(targetIsoString: string, timeSkewMs = 0): TimeLeft {
  const targetTime = new Date(targetIsoString).getTime();
  const now = Date.now() + timeSkewMs;
  const diff = targetTime - now;

  if (isNaN(targetTime) || diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return { days, hours, minutes, seconds, isExpired: false };
}

/**
 * Default fallback deadline generator: Next Sunday 23:59:59 Asia/Dhaka time.
 */
function getFallbackSundayDeadline(): string {
  const now = new Date();
  const dhakaOffsetMs = 6 * 60 * 60 * 1000;
  const dhakaTime = new Date(now.getTime() + dhakaOffsetMs);

  const year = dhakaTime.getUTCFullYear();
  const month = dhakaTime.getUTCMonth();
  const date = dhakaTime.getUTCDate();
  const day = dhakaTime.getUTCDay();

  let daysUntilSunday = (7 - day) % 7;
  if (day === 0 && dhakaTime.getUTCHours() >= 23 && dhakaTime.getUTCMinutes() >= 59) {
    daysUntilSunday = 7;
  }

  const deadline = new Date(Date.UTC(year, month, date + daysUntilSunday, 17, 59, 59, 999));
  return deadline.toISOString();
}

export function DealCountdown({
  workerUrl,
  initialEndTime,
  className = '',
  onExpire,
}: DealCountdownProps) {
  const [targetEndTime, setTargetEndTime] = useState<string>(initialEndTime || getFallbackSundayDeadline());
  const [timeSkewMs, setTimeSkewMs] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(!initialEndTime);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calculateTimeLeft(targetEndTime, 0));

  // Fetch accurate promotion end-time from Cloudflare Worker edge function
  const fetchEdgePromotionTime = useCallback(async () => {
    const endpoint = workerUrl || process.env.NEXT_PUBLIC_DEAL_TIMER_WORKER_URL;

    if (!endpoint) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });

      if (response.ok) {
        const data: DealTimeResponse = await response.json();
        if (data.endTime) {
          setTargetEndTime(data.endTime);
          if (data.serverTime) {
            const serverMs = new Date(data.serverTime).getTime();
            const clientMs = Date.now();
            if (!isNaN(serverMs)) {
              setTimeSkewMs(serverMs - clientMs);
            }
          }
        }
      }
    } catch {
      // Fallback silently to client-calculated Sunday deadline on worker unreachable
    } finally {
      setIsLoading(false);
    }
  }, [workerUrl]);

  useEffect(() => {
    fetchEdgePromotionTime();
  }, [fetchEdgePromotionTime]);

  // Main tick timer loop
  useEffect(() => {
    const updateCountdown = () => {
      const remaining = calculateTimeLeft(targetEndTime, timeSkewMs);
      setTimeLeft(remaining);

      if (remaining.isExpired && onExpire) {
        onExpire();
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [targetEndTime, timeSkewMs, onExpire]);

  if (isLoading) {
    return (
      <div aria-live="polite" className={`deal-countdown rounded-[18px] border px-4 py-3 ${className}`}>
        <span className="text-xs font-bold text-warm-muted">Loading deal timer…</span>
      </div>
    );
  }

  if (timeLeft.isExpired) {
    return (
      <div className={`deal-countdown rounded-[18px] border p-4 text-center ${className}`}>
        <p className="text-xs font-black uppercase tracking-wider text-warm-fg">Deal ended</p>
        <p className="mt-1 text-xs font-medium text-warm-muted">
          Check back for the next weekly offer.
        </p>
      </div>
    );
  }

  return (
    <div className={`deal-countdown flex items-center gap-3 rounded-[18px] border px-3 py-2.5 sm:px-4 ${className}`}>
      <span className="hidden text-xs font-extrabold uppercase tracking-wider text-warm-muted sm:inline">
        Ends in
      </span>
      <time
        dateTime={targetEndTime}
        aria-label={`${timeLeft.days} days, ${timeLeft.hours} hours, ${timeLeft.minutes} minutes, ${timeLeft.seconds} seconds remaining`}
        className="flex items-center gap-1.5 font-mono text-center"
      >
        {[
          ['Days', timeLeft.days],
          ['Hrs', timeLeft.hours],
          ['Min', timeLeft.minutes],
          ['Sec', timeLeft.seconds],
        ].map(([label, value], index) => (
          <React.Fragment key={String(label)}>
            {index > 0 && <span className="mb-4 text-xs font-black text-warm-accent" aria-hidden="true">:</span>}
            <span className="flex flex-col items-center">
              <span className="deal-countdown-value min-w-[32px] rounded-lg px-2 py-1 text-xs font-black">
                {String(value).padStart(2, '0')}
              </span>
              <span className="mt-0.5 text-xs font-semibold uppercase leading-4 text-warm-muted">
                {label}
              </span>
            </span>
          </React.Fragment>
        ))}
      </time>
    </div>
  );
}
