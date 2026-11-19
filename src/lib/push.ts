import { api, type PushConfig, type PublicFirebaseConfig } from "./api";

const CLIENT_KEY = "adgenie.push.client";
const ENABLED_KEY = "adgenie.push.enabled";
const CONFIG_KEY = "adgenie.push.config";
const SERVICE_WORKER_PATH = "/firebase-messaging-sw.js";

/** Lets the long-lived listener re-arm after the settings toggle is used. */
export const PUSH_STATE_CHANGED_EVENT = "adgenie:push-changed";

export type PushFailure =
  | "unavailable"
  | "unsupported"
  | "blocked"
  | "dismissed"
  | "no_token"
  | "failed";

export class PushError extends Error {
  constructor(readonly code: PushFailure, message?: string) {
    super(message ?? code);
    this.name = "PushError";
  }
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable in hardened browsers; push still works for
    // this page session, it just will not be remembered on the next visit.
  }
}

function remove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function randomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** A random per-browser id; it is not a secret, just a stable device name. */
export function getPushClientId(): string {
  const existing = read(CLIENT_KEY);
  if (existing && /^[A-Za-z0-9_-]{16,80}$/.test(existing)) return existing;
  const id = randomId();
  write(CLIENT_KEY, id);
  return id;
}

export function pushEnabledLocally(): boolean {
  return read(ENABLED_KEY) === "1";
}

export function cachedPushConfig(): PublicFirebaseConfig | null {
  const raw = read(CONFIG_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PublicFirebaseConfig>;
    return parsed.apiKey && parsed.projectId && parsed.messagingSenderId && parsed.appId
      ? (parsed as PublicFirebaseConfig)
      : null;
  } catch {
    return null;
  }
}

function clearLocalState(forgetDevice: boolean): void {
  remove(ENABLED_KEY);
  remove(CONFIG_KEY);
  if (forgetDevice) remove(CLIENT_KEY);
}

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function pushSupported(): Promise<boolean> {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    !("serviceWorker" in navigator) ||
    !window.isSecureContext
  ) {
    return false;
  }
  try {
    const { isSupported } = await import("firebase/messaging");
    return await isSupported();
  } catch {
    return false;
  }
}

async function messagingFor(config: PublicFirebaseConfig) {
  const [{ getApps, initializeApp }, { getMessaging }] = await Promise.all([
    import("firebase/app"),
    import("firebase/messaging"),
  ]);
  const app = getApps().find((candidate) => candidate.name === "[DEFAULT]") ??
    initializeApp(config);
  return getMessaging(app);
}

async function registerServiceWorker(config: PublicFirebaseConfig) {
  const url = `${SERVICE_WORKER_PATH}?config=${encodeBase64Url(JSON.stringify(config))}`;
  const registration = await navigator.serviceWorker.register(url, { scope: "/" });
  await navigator.serviceWorker.ready;
  return registration;
}

function mapFailure(err: unknown): PushFailure {
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code?: unknown }).code)
      : "";
  if (code.includes("permission-blocked")) return "blocked";
  if (code.includes("unsupported")) return "unsupported";
  if (code.includes("token-subscribe")) return "no_token";
  return "failed";
}

/**
 * Must be called from a user gesture, because it asks for notification
 * permission. Registration happens only after permission is granted.
 */
export async function enablePush(config: PushConfig): Promise<void> {
  if (!config.enabled || !config.config || !config.vapidKey) {
    throw new PushError("unavailable");
  }
  if (
    typeof Notification === "undefined" ||
    !("serviceWorker" in navigator) ||
    !window.isSecureContext
  ) {
    throw new PushError("unsupported");
  }

  // Safari requires the permission prompt to start inside the click task, so
  // kick it off before awaiting anything else.
  const permissionPromise = Notification.requestPermission();
  const supported = await pushSupported();
  if (!supported) {
    await permissionPromise.catch(() => null);
    throw new PushError("unsupported");
  }

  const permission = await permissionPromise.catch(() => "default" as NotificationPermission);
  if (permission === "denied") throw new PushError("blocked");
  if (permission !== "granted") throw new PushError("dismissed");

  try {
    const registration = await registerServiceWorker(config.config);
    const messaging = await messagingFor(config.config);
    const { getToken } = await import("firebase/messaging");
    const token = await getToken(messaging, {
      vapidKey: config.vapidKey,
      serviceWorkerRegistration: registration,
    });
    if (!token) throw new PushError("no_token");

    await api("/notifications/devices", {
      method: "POST",
      body: { clientId: getPushClientId(), token },
    });

    write(ENABLED_KEY, "1");
    write(CONFIG_KEY, JSON.stringify(config.config));
    window.dispatchEvent(new Event(PUSH_STATE_CHANGED_EVENT));
  } catch (err) {
    if (err instanceof PushError) throw err;
    throw new PushError(mapFailure(err));
  }
}

/**
 * Runs on every studio load for an opted-in browser. It silently refreshes the
 * token if FCM rotated it and re-saves the device; it never prompts.
 */
export async function refreshPushRegistration(config: PushConfig): Promise<boolean> {
  if (!config.enabled || !config.config || !config.vapidKey) return false;
  if (!pushEnabledLocally()) return false;
  if (!("Notification" in window) || Notification.permission !== "granted") return false;

  try {
    const registration = await registerServiceWorker(config.config);
    const messaging = await messagingFor(config.config);
    const { getToken } = await import("firebase/messaging");
    const token = await getToken(messaging, {
      vapidKey: config.vapidKey,
      serviceWorkerRegistration: registration,
    });
    if (!token) return false;

    await api("/notifications/devices", {
      method: "POST",
      body: { clientId: getPushClientId(), token },
    });
    write(CONFIG_KEY, JSON.stringify(config.config));
    return true;
  } catch {
    // Offline, stale config, or a browser that no longer supports push. The
    // in-app inbox still works; the next load tries again.
    return false;
  }
}

export async function disablePush(options: { forgetDevice?: boolean } = {}): Promise<void> {
  const clientId = read(CLIENT_KEY);
  const wasEnabled = pushEnabledLocally();

  try {
    if (wasEnabled && clientId) {
      await api(`/notifications/devices/${encodeURIComponent(clientId)}`, {
        method: "DELETE",
      });
    }
  } catch {
    // A failed unregister must not trap the user in an enabled-looking state.
  }

  try {
    const config = cachedPushConfig();
    if (wasEnabled && config) {
      const { deleteToken } = await import("firebase/messaging");
      const messaging = await messagingFor(config);
      await deleteToken(messaging);
    }
  } catch {
    // The token may already be gone; clearing the registration below still
    // stops this browser from displaying messages.
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      const script = registration.active?.scriptURL ?? registration.installing?.scriptURL;
      if (script?.includes(SERVICE_WORKER_PATH)) await registration.unregister();
    }
  } catch {
    // ignore
  }

  clearLocalState(Boolean(options.forgetDevice));
  window.dispatchEvent(new Event(PUSH_STATE_CHANGED_EVENT));
}

/** Best effort, time-boxed so signing out never waits on a push network call. */
export async function cleanupPushForSignOut(): Promise<void> {
  if (typeof window === "undefined") return;
  const clientId = read(CLIENT_KEY);
  const wasEnabled = pushEnabledLocally();
  const work = disablePush({ forgetDevice: true }).catch(() => {});
  if (!wasEnabled && !clientId) return;

  await Promise.race([
    work,
    new Promise<void>((resolve) => setTimeout(resolve, 2500)),
  ]);
  // Whatever happened above, nothing of this account should be left behind.
  clearLocalState(true);
}

export interface ForegroundPush {
  title: string;
  body: string;
  href: string;
}

/** Foreground messages only; background messages are shown by the worker. */
export async function listenForForegroundPush(
  handler: (message: ForegroundPush) => void
): Promise<() => void> {
  const config = cachedPushConfig();
  if (!config || !pushEnabledLocally()) return () => {};

  try {
    const { onMessage } = await import("firebase/messaging");
    const messaging = await messagingFor(config);
    return onMessage(messaging, (payload) => {
      const data = (payload.data ?? {}) as Record<string, string | undefined>;
      const title = data.title?.trim() || "AdGenie Africa";
      handler({
        title,
        body: data.body?.trim() || "You have a new update.",
        href: data.href?.trim() || "/notifications",
      });
    });
  } catch {
    return () => {};
  }
}
