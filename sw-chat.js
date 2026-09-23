/* Genesis chat device notifications */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const roomId = event.notification.data && event.notification.data.roomId;
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        for (const client of list) {
          if ("focus" in client) {
            client.postMessage({ type: "chat-notify-click", roomId });
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          const q = roomId ? `?tab=chat&chatRoom=${encodeURIComponent(roomId)}` : "?tab=chat";
          return self.clients.openWindow(`/${q}`);
        }
        return undefined;
      })
  );
});
