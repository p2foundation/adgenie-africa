"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type Phase = "idle" | "loading" | "done";

const REVEAL_DELAY_MS = 80;
const MIN_VISIBLE_MS = 300;
const FAILSAFE_MS = 12000;
const FADE_MS = 600;

/**
 * A hairline of light that runs across the top of the viewport while a
 * client-side route change is in flight. It starts only for real
 * navigations (not hash jumps or new-tab clicks), waits briefly so cached
 * pages never flash, and retracts when the router commits the new URL.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const barRef = useRef<HTMLSpanElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");

  // Redundant completion signal for navigations the history patch misses
  // (back/forward, anything that swaps the tree without a push).
  useEffect(() => {
    window.dispatchEvent(new Event("adgenie:route-commit"));
  }, [pathname]);

  useEffect(() => {
    const el = () => barRef.current;

    let navigating = false;
    let visible = false;
    let shownAt = 0;
    let revealTimer = 0;
    let failsafeTimer = 0;
    let finishTimer = 0;
    let resetTimer = 0;
    let frame = 0;

    function begin() {
      if (navigating) return;
      navigating = true;
      visible = false;
      window.clearTimeout(revealTimer);
      window.clearTimeout(failsafeTimer);
      window.clearTimeout(finishTimer);
      window.clearTimeout(resetTimer);
      window.cancelAnimationFrame(frame);
      revealTimer = window.setTimeout(reveal, REVEAL_DELAY_MS);
    }

    function reveal() {
      if (!navigating) return;
      visible = true;
      shownAt = performance.now();
      setPhase("loading");

      const bar = el();
      if (!bar) return;
      bar.style.transition = "none";
      bar.style.transform = "scaleX(0.08)";
      // Commit the starting width before handing over to the long ease.
      void bar.offsetWidth;
      frame = window.requestAnimationFrame(() => {
        if (!navigating) return;
        bar.style.transition = "transform 7s cubic-bezier(0.12, 0.85, 0.25, 1)";
        bar.style.transform = "scaleX(0.86)";
      });

      failsafeTimer = window.setTimeout(commit, FAILSAFE_MS);
    }

    function commit() {
      if (!navigating) return;
      navigating = false;
      window.clearTimeout(revealTimer);
      window.clearTimeout(failsafeTimer);
      window.cancelAnimationFrame(frame);
      if (!visible) return;

      const wait = Math.max(0, MIN_VISIBLE_MS - (performance.now() - shownAt));
      window.clearTimeout(finishTimer);
      finishTimer = window.setTimeout(() => {
        const bar = el();
        if (bar) {
          bar.style.transition = "transform 180ms cubic-bezier(0.22, 1, 0.36, 1)";
          bar.style.transform = "scaleX(1)";
        }
        setPhase("done");
        resetTimer = window.setTimeout(() => {
          visible = false;
          setPhase("idle");
          if (bar) {
            bar.style.transition = "none";
            bar.style.transform = "scaleX(0)";
          }
        }, FADE_MS);
      }, wait);
    }

    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      if (anchor.closest("[data-no-route-progress]")) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Same view, different anchor or identical URL: the router has nothing
      // to fetch, so don't paint a loading line.
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }

      begin();
    }

    const routeCommit = () => commit();

    document.addEventListener("click", onClick, true);
    window.addEventListener("adgenie:route-commit", routeCommit);

    const originalPush = window.history.pushState;
    const originalReplace = window.history.replaceState;
    const patchedPush = function (
      this: History,
      ...args: Parameters<History["pushState"]>
    ) {
      const result = originalPush.apply(this, args);
      commit();
      return result;
    };
    const patchedReplace = function (
      this: History,
      ...args: Parameters<History["replaceState"]>
    ) {
      const result = originalReplace.apply(this, args);
      commit();
      return result;
    };
    window.history.pushState = patchedPush;
    window.history.replaceState = patchedReplace;

    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("adgenie:route-commit", routeCommit);
      // Next also wraps these; only undo our own link in the chain.
      if (window.history.pushState === patchedPush) {
        window.history.pushState = originalPush;
      }
      if (window.history.replaceState === patchedReplace) {
        window.history.replaceState = originalReplace;
      }
      window.clearTimeout(revealTimer);
      window.clearTimeout(failsafeTimer);
      window.clearTimeout(finishTimer);
      window.clearTimeout(resetTimer);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="route-progress" data-phase={phase} aria-hidden="true">
      <span ref={barRef} className="route-progress-bar" />
    </div>
  );
}
