# Realtime sockets

Socket.IO over a Redis adapter, with the event contract in `@brnit/realtime` so
the server and both clients are checked against one definition.

**Sockets carry invalidation signals, not data.** An event says *what went
stale*, never *what it now is*. Clients refetch through the HTTP contract, which
is the only layer where authorization is enforced — so a socket message can
never leak something the recipient could not have fetched anyway. Keep payloads
to ids and a reason.

## The layers

| Layer | Where |
| --- | --- |
| Contract — events, payload schemas, room builders | `packages/realtime/src` |
| Socket server, auth, room joins | `apps/server/src/sockets` |
| Validated emit (dual-path) | `apps/server/src/sockets/realtime-emit.service.ts` |
| Emit from a worker process | `apps/server/src/sockets/redis-emitter.ts` |
| Dispatch bridge — resolves ids to rooms | `apps/server/src/jobs/realtime-plan-emit.ts` |
| Web client | `apps/web/src/lib/realtime`, `hooks/use-realtime-socket.ts` |
| Native client | `apps/native/lib/realtime`, `hooks/use-realtime-socket.ts` |

## Rooms

| Room | Joined | Who may |
| --- | --- | --- |
| `user:<userId>` | **automatically, on connect** | nobody may request it — even for themselves |
| `org:<organizationId>` | explicitly, via `realtime:join` | organisation staff, or an app admin |

`org:` is the reason the **web** app needs a socket client at all: it is the
staff room, and staff screens are web. Without a web client, the `org:` room
builder, its authorization branch and half of `emitAssessmentRecordedBestEffort`
are unreachable code.

Room joins **deny by default** — an unrecognised room string falls through to
`INVALID_ROOM`. The join protocol is `realtime:join` `{room}` → on failure
`realtime:join-error` `{code}` where code is `INVALID_ROOM | FORBIDDEN |
PARSE_ERROR`. `realtime:leave` needs no authorization.

Authorization is re-checked against the database on **every** join, because auth
runs only at connect time and a socket outlives the session that opened it.

## Auth

There is no separate socket token. The Better Auth session cookie rides on the
upgrade request:

```ts
const session = await auth.api.getSession({ headers: fromNodeHeaders(socket.request.headers) });
```

Rejections must put the machine-readable code on `err.data` — socket.io forwards
only that to the client, not the message.

The two clients differ in exactly one respect, and it is the thing that breaks
first if you copy the wrong one:

- **Web** — `withCredentials: true`. The browser attaches the cookie itself.
- **Native** — `extraHeaders: { Cookie: authClient.getCookie() }`. React Native
  has no cookie jar, so `withCredentials` alone fails the handshake.

## Emitting

Never call `io.emit` directly. Go through `realtime-emit.service.ts`, which:

1. **Re-validates the payload** against its contract schema before it leaves, so
   a drifted emit is dropped with a warning rather than shipped.
2. **Picks its transport**: the API process emits through its own `Server`; a
   BullMQ worker has no `Server`, so it publishes to the same Redis channels the
   adapter listens on. Callers never know which process they are in.

Every public wrapper is `…BestEffort` and **cannot throw**. Emits run *after*
the handler returned and the response was sent, so a failed emit must never turn
a successful write into a failed request.

### Adding an event

1. Add the name to `REALTIME_EVENTS` and a zod payload schema under
   `packages/realtime/src/payloads/`.
2. Record which query keys it invalidates in `client-actions.ts`. That file is
   documentation, not runtime — its purpose is that a new event cannot ship
   without someone writing down what it makes stale.
3. Add a typed `…BestEffort` wrapper to the emit service.
4. Call it from the controller, **after** `res.json(...)`.
5. Add a handler in each client: `safeParse` on receive, then
   `invalidateQueries`. Validate on receive as well as emit — it is the only
   check that survives a client running an older deploy.

### Which writes emit

Staff writes emit; a member's own write does not, because the client that made
it already knows. The **one deliberate exception** is `meal_time_changed`
(item and time overrides): those are member self-writes at `/member/me/…`, and
the event exists to reach the member's *other* signed-in devices. The originating
client refetching once is the accepted cost.

## Gotchas worth knowing

- **`bun run --hot` does not always pick up a new emit call site.** A missing
  event with no error in the log is the signature; restart the API before
  concluding the dispatcher is broken. This cost real debugging time once.
- **Nutritionist-created assignments always have `user_id = NULL`** — the input
  schema requires `memberId` and does not accept `userId`. A delete path that
  passes only `userId` from the deleted DTO will silently drop every event.
  Resolution order in the dispatcher is `userId` → `memberId` → assignment
  lookup; a delete must supply one of the first two, because the row is gone.
- **`member` has no unique `(organization_id, user_id)` constraint**, so the
  staff check queries all rows and uses `.some()` rather than `findFirst`.
- **Nothing is replayed after a reconnect.** Both clients invalidate on a
  *re*-connect so changes made while the socket was down become visible.
- **`connect_error` is routine** — a deploy, a tunnel blip, a laptop waking.
  socket.io retries on its own; log it at `warn`, never surface it to the user.
  Realtime is an accelerant, and every screen still works over HTTP without it.

## Verifying it by hand

```bash
# is anything connected?
curl -s http://localhost:3100/api/v1/health   # -> socket.clientsCount

# watch the wire directly, independent of any client
docker exec brnit-redis-1 redis-cli -a "$REDIS_PASSWORD" psubscribe 'socket.io#*'
```

The end-to-end check that actually proves something: open the member's Home
screen, then from the host sign in as a nutritionist and
`POST /api/v1/nutritionist/diet-plan-meal-consumptions` for that member. The
meal must flip to consumed **without touching the device**. Native sets
`staleTime: 60s`, `refetchOnWindowFocus: false` and does not poll, so a refetch
can only have come from the socket.
