"use client";

import { motion, useReducedMotion } from "motion/react";
import { DURATION, EASE, STAGGER } from "@/lib/motion";

/**
 * Scroll reveal. Fires once - re-animating on every scroll past is noise, not
 * information. Reduced motion collapses it to a plain fade.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  /** Index in a group; multiplied by the 40ms stagger token. */
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{
        duration: reduced ? DURATION.instant : DURATION.page,
        ease: EASE.standard,
        delay: reduced ? 0 : delay * STAGGER,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
