"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Behaviour every hand-rolled dialog in this app needs: focus on open, a focus
 * trap so Tab cannot wander behind the scrim, Escape to close, scroll lock and
 * a return trip to whatever opened it.
 *
 * The effect is mount-only by design. A close handler is a new function on
 * every parent render, so depending on it would re-run the effect on each
 * keystroke and pull the caret out of the field being typed in.
 */
export function useDialogPanel<T extends HTMLElement>(
  onClose: () => void,
  options?: { fallback?: () => HTMLElement | null }
) {
  const panel = useRef<T>(null);
  const close = useRef(onClose);
  const fallback = useRef(options?.fallback);

  useEffect(() => {
    close.current = onClose;
  }, [onClose]);

  useEffect(() => {
    fallback.current = options?.fallback;
  });

  useEffect(() => {
    const node = panel.current;
    if (!node) return;

    const opener = document.activeElement as HTMLElement | null;
    node.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close.current();
        return;
      }
      if (event.key !== "Tab" || !panel.current) return;
      const targets = Array.from(
        panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (targets.length === 0) {
        event.preventDefault();
        return;
      }
      const first = targets[0];
      const last = targets[targets.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === panel.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      // A row can re-render or unmount while the dialog is open (a day sheet
      // closing, a card moving into a slot), taking the opener with it.
      // The fallback keeps the keyboard on the screen the user came from.
      if (opener && document.contains(opener)) opener.focus();
      else fallback.current?.()?.focus();
    };
  }, []);

  return panel;
}
