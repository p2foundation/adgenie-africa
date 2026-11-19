"use client";

import { useEffect } from "react";

/**
 * A back/forward gesture can restore a cached copy of an authenticated page
 * after sign-out, leaving account HTML on screen. Reload on restore instead:
 * the server re-checks the session and either renders fresh data or redirects
 * to sign-in, so a signed-out device keeps no visible trace.
 */
export function RevalidateOnRestore() {
  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) window.location.reload();
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  return null;
}
