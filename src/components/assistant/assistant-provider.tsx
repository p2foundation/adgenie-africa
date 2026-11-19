"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { usePathname } from "next/navigation";
import {
  api,
  type NotificationsPage,
  type NotificationsSummary,
} from "@/lib/api";
import {
  screenFromPath,
  type AssistantContext,
  type AssistantScreen,
  type AssistantSuggestion,
} from "@/lib/assistant";

/**
 * Genie lives above the dashboard pages. Pages declare what they know with
 * `useAssistantContext`, the wizard also declares how a suggestion can land in
 * a field with `useAssistantApply`, and the dock turns all of that into the
 * context JSON the API expects.
 *
 * Registrations are compared by value, so a brief that changes on every
 * keystroke settles after one extra pass instead of looping. The store is
 * deliberately small: no transcript, no user data beyond what the page shows.
 */

export interface AssistantApplyHandler {
  /** Button text when this suggestion belongs in a field; null when it does not. */
  label: (suggestion: AssistantSuggestion) => string | null;
  apply: (suggestion: AssistantSuggestion) => void;
}

interface AssistantValue {
  open: boolean;
  seed: string | null;
  screen: AssistantScreen;
  applyHandler: AssistantApplyHandler | null;
  openAssistant: (seed?: string) => void;
  closeAssistant: () => void;
  toggleAssistant: () => void;
  consumeSeed: () => void;
  /** Merge the page registrations now, then top up with what the API knows. */
  buildContext: () => Promise<AssistantContext>;
  registerContext: (id: string, value: AssistantContext) => void;
  unregisterContext: (id: string) => void;
  setApplyHandler: Dispatch<SetStateAction<AssistantApplyHandler | null>>;
}

const AssistantReactContext = createContext<AssistantValue | null>(null);

function useAssistantValue(): AssistantValue {
  const value = useContext(AssistantReactContext);
  if (!value) {
    throw new Error("Genie hooks need to sit inside <AssistantProvider>.");
  }
  return value;
}

export function AssistantProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [seed, setSeed] = useState<string | null>(null);
  const [slots, setSlots] = useState<Record<string, AssistantContext>>({});
  const [applyHandler, setApplyHandler] = useState<AssistantApplyHandler | null>(
    null
  );

  const screen = screenFromPath(pathname ?? "/dashboard");

  const openAssistant = useCallback((nextSeed?: string) => {
    setSeed(nextSeed ?? null);
    setOpen(true);
  }, []);

  const closeAssistant = useCallback(() => {
    setOpen(false);
    setSeed(null);
  }, []);

  const toggleAssistant = useCallback(() => {
    setOpen((current) => !current);
  }, []);

  const consumeSeed = useCallback(() => {
    setSeed(null);
  }, []);

  const registerContext = useCallback((id: string, value: AssistantContext) => {
    setSlots((current) => {
      if (JSON.stringify(current[id] ?? null) === JSON.stringify(value)) {
        return current;
      }
      return { ...current, [id]: value };
    });
  }, []);

  const unregisterContext = useCallback((id: string) => {
    setSlots((current) => {
      if (!(id in current)) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);

  const buildContext = useCallback(async (): Promise<AssistantContext> => {
    const merged: AssistantContext = {
      screen: screenFromPath(pathname ?? "/dashboard"),
    };
    for (const slot of Object.values(slots)) {
      Object.assign(merged, slot);
    }

    if (merged.screen === "notifications") {
      try {
        const [summary, page] = await Promise.all([
          api<NotificationsSummary>("/notifications/summary"),
          api<NotificationsPage>("/notifications?filter=all&limit=5"),
        ]);
        merged.notifications = {
          unread: summary.unread,
          recent: page.items.map((item) => ({
            kind: item.kind,
            title: item.title,
          })),
        };
      } catch {
        // Alerts are optional context; a failed read must not block a question.
      }
    }

    if (typeof merged.credits !== "number") {
      try {
        merged.credits = await api<number>("/credits/balance");
      } catch {
        // Same: without a balance the answer is just less specific.
      }
    }

    return merged;
  }, [pathname, slots]);

  const value = useMemo<AssistantValue>(
    () => ({
      open,
      seed,
      screen,
      applyHandler,
      openAssistant,
      closeAssistant,
      toggleAssistant,
      consumeSeed,
      buildContext,
      registerContext,
      unregisterContext,
      setApplyHandler,
    }),
    [
      open,
      seed,
      screen,
      applyHandler,
      openAssistant,
      closeAssistant,
      toggleAssistant,
      consumeSeed,
      buildContext,
      registerContext,
      unregisterContext,
    ]
  );

  return (
    <AssistantReactContext.Provider value={value}>
      {children}
    </AssistantReactContext.Provider>
  );
}

/** Open, close or toggle the dock. */
export function useAssistant() {
  const {
    open,
    seed,
    screen,
    applyHandler,
    openAssistant,
    closeAssistant,
    toggleAssistant,
  } = useAssistantValue();
  return {
    open,
    seed,
    screen,
    applyHandler,
    openAssistant,
    closeAssistant,
    toggleAssistant,
  };
}

/**
 * Declare what this page or form knows. Memoise `value` when it is built from
 * many fields; the provider compares by value before storing it.
 */
export function useAssistantContext(value: AssistantContext) {
  const { registerContext, unregisterContext } = useAssistantValue();
  const id = useId();

  // Register and teardown are separate effects on purpose. One effect that both
  // unregisters and registers re-runs whenever a caller passes a fresh object,
  // and deleting a stored slot always changes state — the provider renders, the
  // page renders, the page hands over a new object, and the tab spins forever.
  useEffect(() => {
    registerContext(id, value);
  }, [id, value, registerContext]);

  useEffect(() => () => unregisterContext(id), [id, unregisterContext]);
}

/**
 * Declare how a suggestion can land in a field. The handler must be memoised:
 * register once, use functional state updates so it never goes stale.
 */
export function useAssistantApply(handler: AssistantApplyHandler) {
  const { setApplyHandler } = useAssistantValue();

  useEffect(() => {
    setApplyHandler(handler);
    return () => {
      setApplyHandler((current) => (current === handler ? null : current));
    };
  }, [handler, setApplyHandler]);
}

/** Dock-only: the full controller, including the context builder. */
export function useAssistantController() {
  return useAssistantValue();
}
