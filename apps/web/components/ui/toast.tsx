"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import * as React from "react";
import { Icon } from "@/components/ui/icon";
import { DURATION, EASE, exitOf } from "@/lib/motion";

type Tone = "info" | "success" | "danger";
type Toast = { id: number; tone: Tone; message: string };

const GLYPH = { info: Info, success: CircleCheck, danger: CircleAlert } as const;
const TINT = {
  info: "bg-tint-info text-on-tint-info",
  success: "bg-tint-success text-on-tint-success",
  danger: "bg-tint-danger text-on-tint-danger",
} as const;

const Ctx = React.createContext<((message: string, tone?: Tone) => void) | null>(
  null,
);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const nextId = React.useRef(0);

  const dismiss = React.useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback(
    (message: string, tone: Tone = "info") => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, tone, message }]);
      // Errors stay until dismissed; anything else clears itself.
      if (tone !== "danger") setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  return (
    <Ctx.Provider value={toast}>
      {children}
      <ToastRegion toasts={toasts} onDismiss={dismiss} />
    </Ctx.Provider>
  );
}

function ToastRegion({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  const reduced = useReducedMotion();

  return (
    <div
      // Polite: a toast never interrupts a screen reader mid-sentence.
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-(--z-toast) flex flex-col items-center gap-2 p-4 sm:items-end"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              reduced
                ? { opacity: 0, transition: { duration: DURATION.instant } }
                : {
                    opacity: 0,
                    scale: 0.96,
                    transition: { duration: exitOf(DURATION.slow), ease: EASE.in },
                  }
            }
            transition={{ duration: DURATION.slow, ease: EASE.spring }}
            className="pointer-events-auto flex w-full max-w-[420px] items-start gap-3 rounded-lg border border-border bg-surface-raised p-3 shadow-e3"
          >
            <span
              className={`grid size-7 shrink-0 place-items-center rounded-md ${TINT[t.tone]}`}
            >
              <Icon of={GLYPH[t.tone]} size={16} />
            </span>
            <p className="min-w-0 flex-1 break-words pt-0.5 text-body-sm text-fg">
              {t.message}
            </p>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              aria-label="Dismiss notification"
              className="-m-2 grid size-11 shrink-0 place-items-center rounded-md text-icon-subtle transition-colors duration-(--duration-fast) hover:text-fg"
            >
              <Icon of={X} size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function useToast() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
