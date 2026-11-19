/**
 * Background half of AdGenie web push. The page registers this file with the
 * public Firebase config in the query string; the service account never
 * reaches the browser. Data-only messages arrive here, so this handler is the
 * only thing that displays a notification — no duplicate system banners.
 */
importScripts("https://www.gstatic.com/firebasejs/13.1.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/13.1.0/firebase-messaging-compat.js");

const NOTIFICATIONS_PATH = "/notifications";

function readConfig() {
  try {
    const encoded = new URL(self.location.href).searchParams.get("config");
    if (!encoded) return null;
    const padded = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const config = JSON.parse(atob(padded));
    return config && config.apiKey && config.projectId && config.appId ? config : null;
  } catch {
    return null;
  }
}

const config = readConfig();

if (config) {
  firebase.initializeApp(config);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const data = payload.data || {};
    const title = (data.title || "AdGenie Africa").slice(0, 120);
    const body = (data.body || "You have a new update.").slice(0, 500);
    const href = typeof data.href === "string" && data.href.startsWith("/")
      ? data.href
      : NOTIFICATIONS_PATH;

    self.registration.showNotification(title, {
      body,
      tag: data.notificationId || undefined,
      data: { href, notificationId: data.notificationId || "" },
      timestamp: Date.now(),
    });
  });
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href =
    event.notification.data && typeof event.notification.data.href === "string"
      ? event.notification.data.href
      : NOTIFICATIONS_PATH;

  let target;
  try {
    target = new URL(href, self.location.origin);
    // Only ever open the app itself; a crafted payload cannot redirect the
    // browser to another origin from a trusted system notification.
    if (target.origin !== self.location.origin) target = new URL(NOTIFICATIONS_PATH, self.location.origin);
  } catch {
    target = new URL(NOTIFICATIONS_PATH, self.location.origin);
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windows) => {
        for (const client of windows) {
          if (new URL(client.url).origin !== self.location.origin) continue;
          return client.focus().then(() => {
            if ("navigate" in client) return client.navigate(target.href);
            return client;
          });
        }
        return self.clients.openWindow(target.href);
      })
  );
});
