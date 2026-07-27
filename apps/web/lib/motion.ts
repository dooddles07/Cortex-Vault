import type { Transition, Variants } from "motion/react";

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

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.page, ease: EASE.standard },
  },
};

export const fade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DURATION.base, ease: EASE.out } },
};

/** Dialogs, sheets and the command palette all enter from 0.96. */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: DURATION.slow, ease: EASE.spring },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: { duration: exitOf(DURATION.slow), ease: EASE.in },
  },
};

export const staggerChildren = (delayChildren = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: STAGGER, delayChildren } },
});

/**
 * Reduced motion collapses everything to a 100ms opacity fade - no translate,
 * no scale. Pass the result straight into `variants`.
 */
export function reduceVariants(variants: Variants, reduced: boolean): Variants {
  return reduced ? fadeOnly : variants;
}

const fadeOnly: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DURATION.instant } },
  exit: { opacity: 0, transition: { duration: DURATION.instant } },
};
