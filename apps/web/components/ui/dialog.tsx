"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import * as React from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { DURATION, EASE, exitOf } from "@/lib/motion";

/**
 * Built on the native <dialog> element, which supplies the focus trap, the
 * Escape handling, focus return to the trigger, and top-layer stacking for
 * free. The element stays mounted and is opened imperatively so the exit
 * animation can finish before close() drops it out of the top layer.
 *
 * Spec: docs/DESIGN.md section 7 (Dialog / Sheet).
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  footer,
  variant = "auto",
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  footer?: React.ReactNode;
  /** "sheet" forces the mobile bottom sheet at every width. */
  variant?: "auto" | "dialog" | "sheet";
  className?: string;
  children?: React.ReactNode;
}) {
  const ref = React.useRef<HTMLDialogElement>(null);
  const titleId = React.useId();
  const descId = React.useId();
  const reduced = useReducedMotion();

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
  }, [open]);

  // Escape fires "cancel"; intercept it so the close runs through our exit
  // animation rather than snapping shut.
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };
    el.addEventListener("cancel", onCancel);
    return () => el.removeEventListener("cancel", onCancel);
  }, [onClose]);

  const isSheet = variant === "sheet";

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      // The element is only a transparent stage; the scrim and panel below do
      // the drawing, so they can animate independently.
      className="m-0 max-h-none max-w-none bg-transparent p-0 backdrop:bg-transparent open:size-full"
    >
      <AnimatePresence onExitComplete={() => ref.current?.close()}>
        {open && (
          <div
            className={cn(
              "fixed inset-0 flex justify-center",
              isSheet ? "items-end" : "items-end sm:items-center",
            )}
          >
            <motion.button
              type="button"
              tabIndex={-1}
              aria-label="Close"
              onClick={onClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: DURATION.instant } }}
              transition={{ duration: DURATION.fast, ease: EASE.out }}
              className="absolute inset-0 cursor-default bg-(--scrim) backdrop-blur-[2px]"
            />

            <motion.div
              role="document"
              drag={isSheet && !reduced ? "y" : false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.4 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 120 || info.velocity.y > 500) onClose();
              }}
              initial={
                reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 16 }
              }
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={
                reduced
                  ? { opacity: 0, transition: { duration: DURATION.instant } }
                  : {
                      opacity: 0,
                      scale: 0.96,
                      transition: {
                        duration: exitOf(DURATION.slow),
                        ease: EASE.in,
                      },
                    }
              }
              transition={{ duration: DURATION.slow, ease: EASE.spring }}
              className={cn(
                "relative flex w-full flex-col gap-4 border border-border bg-surface-raised p-5 shadow-e3",
                isSheet
                  ? "max-h-[85dvh] rounded-t-2xl pb-8"
                  : "max-h-[85dvh] max-w-[560px] rounded-t-2xl pb-8 sm:rounded-2xl sm:pb-5",
                className,
              )}
            >
              {/* Grabber marks the sheet as draggable; hidden once it is a
                  centred dialog, where dragging does nothing. */}
              <span
                aria-hidden
                className={cn(
                  "mx-auto -mt-1 h-1 w-10 rounded-full bg-border-strong",
                  !isSheet && "sm:hidden",
                )}
              />

              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 flex-col gap-1">
                  <h2 id={titleId} className="text-h3 text-fg">
                    {title}
                  </h2>
                  {description && (
                    <p id={descId} className="measure text-body-sm text-fg-muted">
                      {description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close dialog"
                  className="-m-2 grid size-11 shrink-0 place-items-center rounded-md text-icon-subtle transition-colors duration-(--duration-fast) hover:bg-bg-subtle hover:text-fg"
                >
                  <Icon of={X} />
                </button>
              </div>

              {children && (
                <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
              )}

              {footer && (
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </dialog>
  );
}
