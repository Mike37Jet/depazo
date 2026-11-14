const FALLBACK_MESSAGE = {
  title: "depazo",
  body: "Hay departamentos nuevos para ti.",
  url: "/",
};

function isSameOriginPath(value) {
  if (typeof value !== "string" || !value.startsWith("/")) {
    return false;
  }
  return new URL(value, self.location.origin).origin === self.location.origin;
}

function readMessage(event) {
  if (!event.data) {
    return FALLBACK_MESSAGE;
  }
  try {
    const data = event.data.json();
    return {
      title: typeof data.title === "string" ? data.title : FALLBACK_MESSAGE.title,
      body: typeof data.body === "string" ? data.body : FALLBACK_MESSAGE.body,
      url: isSameOriginPath(data.url) ? data.url : FALLBACK_MESSAGE.url,
    };
  } catch {
    return FALLBACK_MESSAGE;
  }
}

self.addEventListener("push", (event) => {
  const message = readMessage(event);
  event.waitUntil(
    self.registration.showNotification(message.title, {
      body: message.body,
      icon: "/icon-192.png",
      badge: "/notification-badge.png",
      lang: "es-EC",
      data: { url: message.url },
    }),
  );
});

async function openApp(path) {
  const target = new URL(path, self.location.origin).href;
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  const existing = windows.find((client) => client.url.startsWith(self.location.origin));
  if (existing) {
    await existing.focus();
    return existing.navigate(target);
  }
  return self.clients.openWindow(target);
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = isSameOriginPath(event.notification.data?.url) ? event.notification.data.url : "/";
  event.waitUntil(openApp(path));
});
