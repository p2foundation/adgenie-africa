import { api } from "./api";
import { cleanupPushForSignOut } from "./push";

/**
 * Clears the HttpOnly session cookie server-side, then leaves by document
 * navigation: a hard load drops the client router cache and any account data
 * held in memory, so nothing of the session survives on this device. Push is
 * torn down first, while the session can still unregister this browser.
 */
export async function signOutAndReset(): Promise<void> {
  try {
    await cleanupPushForSignOut();
  } catch {
    // Push cleanup must never block leaving the account.
  }
  try {
    await api("/auth/sign-out", { method: "POST" });
  } finally {
    window.location.replace("/sign-in");
  }
}
