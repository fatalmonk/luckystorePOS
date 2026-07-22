'use client';

import { useState, useEffect, useCallback } from 'react';

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
    const endpoint =
      workerUrl ||
      process.env.NEXT_PUBLIC_DEAL_TIMER_WORKER_URL ||
      'https://deal-timer.luckystore1947.workers.dev/api/deal-time';

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

  // Early return 1: Render loading placeholder state
  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 bg-warm-fg/90 border border-warm-accent/30 rounded-2xl px-4 py-2 text-white ${className}`}>
        <span className="text-xs font-bold text-warm-accent animate-pulse">Synchronizing Edge Timer...</span>
      </div>
    );
  }

  // Early return 2: Render high-contrast "Deal Expired" state
  if (timeLeft.isExpired) {
    return (
      <div className={`rounded-2xl bg-gradient-to-r from-red-950 via-red-900 to-black border-2 border-red-500/80 p-4 text-center shadow-lg ${className}`}>
        <div className="flex items-center justify-center gap-2 text-red-400 font-black text-xs uppercase tracking-widest">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span>Deal Expired</span>
        </div>
        <p className="text-xs font-bold text-gray-200 mt-1">
          This promotion has ended. Stay tuned for next week&apos;s deals!
        </p>
      </div>
    );
  }

  // Active high-contrast promotional countdown display
  return (
    <div className={`flex items-center gap-2 bg-black/80 border border-warm-accent/60 rounded-2xl px-4 py-2 shadow-lg backdrop-blur-md ${className}`}>
      <span className="text-xs font-extrabold text-warm-accent uppercase tracking-wider hidden sm:inline">
        Ends In:
      </span>
      <div className="flex items-center gap-1.5 font-mono text-center">
        {/* Days */}
        <div className="flex flex-col items-center">
          <div className="bg-warm-accent text-warm-fg font-black px-2 py-1 rounded-lg text-xs min-w-[30px] shadow-sm">
            {String(timeLeft.days).padStart(2, '0')}
          </div>
          <span className="text-[9px] text-gray-400 font-semibold uppercase mt-0.5">Days</span>
        </div>

        <span className="text-warm-accent font-black text-xs -mt-3.5">:</span>

        {/* Hours */}
        <div className="flex flex-col items-center">
          <div className="bg-warm-accent text-warm-fg font-black px-2 py-1 rounded-lg text-xs min-w-[30px] shadow-sm">
            {String(timeLeft.hours).padStart(2, '0')}
          </div>
          <span className="text-[9px] text-gray-400 font-semibold uppercase mt-0.5">Hrs</span>
        </div>

        <span className="text-warm-accent font-black text-xs -mt-3.5">:</span>

        {/* Minutes */}
        <div className="flex flex-col items-center">
          <div className="bg-warm-accent text-warm-fg font-black px-2 py-1 rounded-lg text-xs min-w-[30px] shadow-sm">
            {String(timeLeft.minutes).padStart(2, '0')}
          </div>
          <span className="text-[9px] text-gray-400 font-semibold uppercase mt-0.5">Min</span>
        </div>

        <span className="text-warm-accent font-black text-xs -mt-3.5">:</span>

        {/* Seconds */}
        <div className="flex flex-col items-center">
          <div className="bg-warm-accent text-warm-fg font-black px-2 py-1 rounded-lg text-xs min-w-[30px] shadow-sm animate-pulse">
            {String(timeLeft.seconds).padStart(2, '0')}
          </div>
          <span className="text-[9px] text-gray-400 font-semibold uppercase mt-0.5">Sec</span>
        </div>
      </div>
    </div>
  );
}
