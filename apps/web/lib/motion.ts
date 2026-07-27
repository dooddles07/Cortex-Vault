import type { Transition } from "motion/react";

/**
 * Motion constants mirroring tokens.css 1:1. Framer Motion takes seconds, the
 * CSS custom properties are in ms - these are the same numbers, converted once
 * here so no component ever types a duration on the spot.
 * See docs/DESIGN.md section 6.
 */
export const DURATION = {
  instant: 0.1,
  fast: 0.16,
  base: 0.22,
  slow: 0.32,
  page: 0.4,
} as const;

/** Exit runs at ~65% of enter, per DESIGN.md section 6. */
export const exitOf = (enter: number) => Number((enter * 0.65).toFixed(3));

export const EASE = {
  standard: [0.2, 0, 0, 1],
  out: [0, 0, 0, 1],
  in: [0.3, 0, 1, 1],
  spring: [0.16, 1, 0.3, 1],
} as const satisfies Record<string, [number, number, number, number]>;

/** Springs for anything that must survive being interrupted mid-flight. */
export const SPRING = {
  gentle: { type: "spring", stiffness: 120, damping: 20, mass: 1 },
  default: { type: "spring", stiffness: 300, damping: 30, mass: 1 },
  snappy: { type: "spring", stiffness: 400, damping: 28, mass: 0.8 },
} as const satisfies Record<string, Transition>;

/** List and grid item entrance offset. */
export const STAGGER = 0.04;
