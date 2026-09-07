# Push + realtime: what the native app still needs

**Status: nothing below is implemented.** `apps/native` currently imports neither
`@brnit/push` nor `@brnit/realtime`, and the `Notifications` row in
`app/(tabs)/profile.tsx` is still an inert `SettingsRow` with no `onPress`. This
file is the scope for that follow-up, written against the server contract as it
stands at the time of the stack overhaul.

## What already exists server-side

| Piece | Where |
| --- | --- |
| `device_token` table (`token` unique across the table, `platform`, `lastSeenAt`) | `packages/db/src/schema/device-token.ts` |
| Register / delete token services | `packages/api/src/push/device-push-token.service.ts` |
| Request schemas + platform enum + notification categories | `packages/push/src/schemas.ts` |
| FCM send + stale-token pruning | `packages/push/src/send-push.ts` |
| Socket.IO server, path `/api/v1/socket.io`, session-cookie handshake auth | `apps/server/src/sockets/socket-server.ts`, `middlewares/socket-auth.middleware.ts` |
| Event names, room builders, join authorization | `packages/realtime/src/events.ts`, `rooms.ts` |

## Blocking gaps to confirm before starting

1. **No HTTP route is mounted for the device-token services yet.** The handlers
   exist; `apps/server/src/routes/` has nothing calling them. Agree the path
   (`POST` / `DELETE /api/member/me/device-tokens` is the shape that matches the
   rest of the member surface) before writing the client, and add it to
   `lib/api/endpoints.ts` so `apiFetch`'s `/api/` → `/api/v1/` rewrite applies.
2. **Firebase config is not in the native project.** `@brnit/push` sends through
   `firebase-admin`; the device side needs `@react-native-firebase/app` +
   `/messaging`, `google-services.json`, `GoogleService-Info.plist`, and an EAS
   config plugin entry. There is no `expo-notifications` dependency either — pick
   one stack, not both.
3. **`EXPO_PUBLIC_*` additions must land in `@brnit/env/native`**, with a
   `.default(...)` like every other key there: Metro inlines these at EAS build
   time and a missing value must degrade, never throw on launch.

## Push — native work

### 1. Permission request
- Ask on a deliberate user action (the `Notifications` settings row), not on
  first launch. iOS gives exactly one system prompt per install.
- `messaging().requestPermission()` on iOS; on Android 13+ also
  `POST_NOTIFICATIONS` via `PermissionsAndroid`.
- Persist the user's own on/off choice separately from the OS grant — a
  zustand slice alongside `store/app-settings-store.ts` — so "off in the app"
  survives an OS-level grant and the row can render three states (off, on,
  blocked in system settings → deep-link to settings).

### 2. Token registration
- Read `messaging().getToken()` after the permission grant, and subscribe to
  `messaging().onTokenRefresh()` for the lifetime of the app.
- `POST` `{ token, platform }` to the device-token endpoint, where `platform` is
  `"ios" | "android"` — import `pushPlatformSchema` /
  `RegisterDevicePushTokenBody` from `@brnit/push/schemas` (a narrow subpath, and
  types only where possible) rather than restating the union.
- Re-register on every app launch while signed in: the server upserts on
  `token` and refreshes `lastSeenAt`, and the planner in
  `apps/server/src/jobs/streak-nudge-planner.ts` only considers users with a row.
- **Gate on the session.** Registration is a `requireSession()` route, so it must
  run after `authClient.useSession()` resolves a user, and must re-run when the
  user changes — a device that changes hands relies on the upsert rewriting
  `user_id`.
- `DELETE` the token on sign-out (in `handleSignOut` in `app/(tabs)/profile.tsx`,
  before `authClient.signOut()`, while the cookie is still valid) and when the
  user turns notifications off.

### 3. Foreground / background handlers
- `messaging().onMessage(...)` — foreground: FCM does **not** display a
  notification itself. Either render an in-app toast through `lib/feedback.ts`
  or post a local notification; do not leave it silent.
- `messaging().setBackgroundMessageHandler(...)` — must be registered at module
  scope in `index.js` / the entry, outside the React tree, or Android drops it.
- `getInitialNotification()` (cold start) and `onNotificationOpenedApp()`
  (warm start) → route with `expo-router`. Categories are
  `meal_reminder`, `streak_nudge`, `plan_update`
  (`pushNotificationCategorySchema`); the first two land on Home, the third
  should also invalidate `memberKeys.currentDietPlanRoot()`.
- FCM `data` is string→string on the wire (`pushNotificationDataSchema`), so
  parse defensively — every field arrives as a string or not at all.
- Android needs one notification channel per category, created at startup, or
  Android 8+ silently drops the notification.

## Realtime — native work

- Connect to `${EXPO_PUBLIC_SERVER_URL}/api/v1/socket.io`. The handshake is
  authenticated with the **Better Auth session cookie**, and native has no cookie
  jar — the socket options must carry
  `extraHeaders: { Cookie: authClient.getCookie() }`, mirroring what
  `lib/api/client.ts` already does for `apiFetch`.
- **Gate the connection on the session**: connect only once
  `authClient.useSession()` has a user, and disconnect on sign-out. An
  unauthenticated handshake is refused outright with
  `data.code = "UNAUTHENTICATED"`, and a banned user with `USER_BANNED`.
- Do not join `user:<id>` — the server's connection handler joins the socket to
  its own user room automatically, and an explicit join of someone else's is
  refused. Members are also *not* allowed into `org:` rooms; only staff are. In
  practice the member app joins nothing and just listens.
- Handle `REALTIME_EVENTS.PLAN_CHANGED` and `ASSESSMENT_RECORDED` as
  **invalidation signals, not data** — they carry no macros or assessment values
  by design. Map them onto `queryClient.invalidateQueries`:
  `memberKeys.currentDietPlanRoot()` and `memberKeys.all` for plan changes,
  `memberKeys.recentAssessments(...)` / `memberKeys.organizationLeaderboardAll()`
  for assessments.
- Also listen for `JOIN_ERROR` and log it; silently ignoring it hides
  authorization regressions.
- Reconnect handling: on `reconnect`, invalidate the member queries once — events
  emitted while the socket was down are not replayed.
- Import event names and room builders from `@brnit/realtime` (values, narrow
  subpath) — never hand-write `"plan:changed"`.

## Profile screen wiring

`app/(tabs)/profile.tsx` renders the `Notifications` row today as:

```tsx
<SettingsRow icon='notifications-outline' label='Notifications' colors={colors} />
```

`SettingsRow` already supports `onPress`, so making it real needs no new
component — it needs a destination (an inline switch, or a sub-screen if per-
category mute lands). `Goals` and `Help & Support` stay inert; they are out of
scope for this follow-up.

## Testing notes

- There is no simulator in CI. Push cannot be verified here; the token
  round-trip against the endpoint is the part worth an integration test.
- iOS push needs a real device and a development build — Expo Go cannot receive
  FCM messages.
