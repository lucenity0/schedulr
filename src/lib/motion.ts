import type { Transition, Variants } from 'framer-motion';

/**
 * Shared motion vocabulary. Keeping the springs and variants in one place is
 * what makes the modules feel like one app rather than five - a page sliding
 * into a frame and a disk head easing to a track should move with the same
 * physics.
 */

export const spring: Transition = {
  type: 'spring',
  stiffness: 320,
  damping: 30,
  mass: 0.8
};

export const gentleSpring: Transition = {
  type: 'spring',
  stiffness: 180,
  damping: 24
};

export const swift: Transition = {
  duration: 0.22,
  ease: [0.4, 0, 0.2, 1]
};

/** A block or card entering the scene. */
export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.8, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: spring },
  exit: { opacity: 0, scale: 0.85, transition: swift }
};

/** A page being loaded into a frame, or an item entering a buffer. */
export const slideIn: Variants = {
  hidden: { opacity: 0, y: -18, scale: 0.9 },
  visible: { opacity: 1, y: 0, scale: 1, transition: spring },
  exit: { opacity: 0, y: 18, scale: 0.9, transition: swift }
};

/** A page being evicted - it should read as "pushed out", not just removed. */
export const evict: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: spring },
  exit: { opacity: 0, scale: 0.6, filter: 'blur(2px)', transition: { duration: 0.28 } }
};

/** Children appear one after another rather than all at once. */
export const stagger = (staggerChildren = 0.05): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren } }
});

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: spring }
};

/** Draw an SVG path progressively. */
export const drawPath: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: { pathLength: { duration: 0.5, ease: 'easeInOut' }, opacity: { duration: 0.1 } }
  }
};

/** Attention pulse for a fault, a miss, or a deadlock. */
export const alertPulse = {
  scale: [1, 1.06, 1],
  transition: { duration: 0.45, ease: 'easeOut' as const }
};

/**
 * Respects the OS "reduce motion" setting. Callers pass their transition
 * through this so an animation degrades to an instant state change rather
 * than being merely faster.
 */
export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const respectMotion = (transition: Transition): Transition =>
  prefersReducedMotion() ? { duration: 0 } : transition;
