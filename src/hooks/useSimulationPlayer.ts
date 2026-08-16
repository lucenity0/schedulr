import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Playback over a precomputed array of steps.
 *
 * Every module simulates its algorithm up front and then plays the result
 * back, rather than computing as it animates. That keeps the visualization
 * honest - scrubbing backwards shows exactly the state that produced the
 * result - and means play/pause/step/scrub logic lives in one place instead
 * of being re-implemented per page with ad-hoc `await sleep()` calls.
 *
 * `current` is a 1-based count of steps taken: 0 means "nothing has happened
 * yet", `steps.length` means the run is complete.
 */

export interface PlayerOptions {
  /** milliseconds per step at 1x */
  baseInterval?: number;
  /** start playing as soon as steps arrive */
  autoPlay?: boolean;
  onComplete?: () => void;
}

export interface Player<T> {
  steps: T[];
  /** number of steps completed, 0..steps.length */
  current: number;
  /** the step that just happened, or undefined before the first one */
  step: T | undefined;
  /** steps completed so far */
  history: T[];
  isPlaying: boolean;
  isComplete: boolean;
  hasSteps: boolean;
  speed: number;
  progress: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  skipToEnd: () => void;
  reset: () => void;
  seek: (index: number) => void;
  setSpeed: (speed: number) => void;
}

export const SPEEDS = [0.5, 1, 2, 4] as const;

export const useSimulationPlayer = <T,>(
  steps: T[],
  { baseInterval = 900, autoPlay = false, onComplete }: PlayerOptions = {}
): Player<T> => {
  const [current, setCurrent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const total = steps.length;
  const isComplete = total > 0 && current >= total;

  // Keep the callback fresh without restarting the interval on every render.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // A new set of steps means a new run.
  useEffect(() => {
    setCurrent(0);
    setIsPlaying(total > 0 && autoPlay);
  }, [steps, total, autoPlay]);

  useEffect(() => {
    if (!isPlaying || total === 0) return;

    const id = window.setInterval(() => {
      setCurrent(prev => {
        if (prev >= total) return prev;
        const next = prev + 1;
        if (next >= total) {
          setIsPlaying(false);
          onCompleteRef.current?.();
        }
        return next;
      });
    }, baseInterval / speed);

    return () => window.clearInterval(id);
  }, [isPlaying, speed, baseInterval, total]);

  const play = useCallback(() => {
    if (total === 0) return;
    // Replaying from the end restarts rather than doing nothing.
    setCurrent(prev => (prev >= total ? 0 : prev));
    setIsPlaying(true);
  }, [total]);

  const pause = useCallback(() => setIsPlaying(false), []);

  const toggle = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, pause, play]);

  const next = useCallback(() => {
    setIsPlaying(false);
    setCurrent(prev => Math.min(prev + 1, total));
  }, [total]);

  const previous = useCallback(() => {
    setIsPlaying(false);
    setCurrent(prev => Math.max(prev - 1, 0));
  }, []);

  const skipToEnd = useCallback(() => {
    setIsPlaying(false);
    setCurrent(total);
  }, [total]);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setCurrent(0);
  }, []);

  const seek = useCallback(
    (index: number) => {
      setIsPlaying(false);
      setCurrent(Math.max(0, Math.min(index, total)));
    },
    [total]
  );

  const history = useMemo(() => steps.slice(0, current), [steps, current]);

  return {
    steps,
    current,
    step: current > 0 ? steps[current - 1] : undefined,
    history,
    isPlaying,
    isComplete,
    hasSteps: total > 0,
    speed,
    progress: total ? (current / total) * 100 : 0,
    play,
    pause,
    toggle,
    next,
    previous,
    skipToEnd,
    reset,
    seek,
    setSpeed
  };
};
