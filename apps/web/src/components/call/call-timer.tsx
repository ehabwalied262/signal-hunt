'use client';

import { useEffect, useState } from 'react';

interface CallTimerProps {
  /** ISO timestamp of when the timer should start counting from */
  startFrom: string | null;
  /** Whether the timer is actively running */
  isRunning: boolean;
}

/**
 * Live call timer that counts up from a start time.
 * Updates every second while the call is active.
 *
 * Displays MM:SS for calls under an hour, HH:MM:SS for longer calls.
 */
export function CallTimer({ startFrom, isRunning }: CallTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startFrom || !isRunning) return;

    const startTime = new Date(startFrom).getTime();

    // Set initial elapsed immediately
    setElapsed(Math.floor((Date.now() - startTime) / 1000));

    const interval = setInterval(() => {
      const now = Date.now();
      setElapsed(Math.floor((now - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startFrom, isRunning]);

  // Reset when not running
  useEffect(() => {
    if (!isRunning) {
      setElapsed(0);
    }
  }, [isRunning]);

  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <span className="font-mono text-lg font-bold tabular-nums">
      {formatTime(elapsed)}
    </span>
  );
}
