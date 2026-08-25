import { setPushNotificationHandler } from "@brnit/api/push/push-notification.registry";

import { enqueuePushNotificationBestEffort } from "./push-notification-queue.js";

/**
 * Fills the registry slots `@brnit/api` declares with their BullMQ-backed
 * implementations.
 *
 * This is the only place the contract package's dependency inversion is
 * resolved. Call it once per process, from **both** entry points — the API
 * process (`startup/setup-app.ts`) and the worker process
 * (`worker-background.ts`) — because a handler running inside a worker needs
 * the same dispatch path a controller does.
 *
 * There is exactly one slot today. `@brnit/realtime` needs none: socket emits
 * are dispatched by controllers, which already live in `apps/server` and can
 * import `sockets/realtime-emit.service.js` directly.
 */
export function registerQueueHandlers(): void {
	setPushNotificationHandler(enqueuePushNotificationBestEffort);
}
