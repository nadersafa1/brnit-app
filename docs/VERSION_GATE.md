# App version gate

Server-managed enforcement of which native builds may run. An admin sets two
thresholds per platform; the server turns a reported build number into a
decision; the native app obeys it.

The gate exists for the case where a build already in the wild has to be
retired — a broken migration, a leaked key, an API contract the old client can
no longer speak. Shipping that judgement to the client would mean it could only
change by shipping another build, which is exactly what is unavailable.

## The decision

`GET /api/v1/app-version?platform=ios|android&version=1.4.2` — **public, no
session**. It answers with an action, never with the thresholds:

```jsonc
{ "action": "block" | "nudge" | "none", "latestVersion": "…", "message": "…", "storeUrl": "…" }
```

Ordered, first match wins:

| Condition | `action` | `message` |
| --- | --- | --- |
| no row for that platform | `none` | `""` |
| `version < minVersion` | `block` | the configured copy |
| `version < latestVersion` | `nudge` | the configured copy |
| otherwise | `none` | `""` — blanked |

Three properties are deliberate and worth not "fixing":

- **A missing row means the gate is off.** A fresh database, a restored backup
  or a platform nobody has configured must never lock users out of an app that
  works. Blocking is only ever an explicit admin decision, so no migration
  seeds a row.
- **`minVersion` is never returned.** The endpoint is public and unmetered;
  publishing the blocking threshold tells anyone which builds still pass. The
  client is handed the decision, not the inputs.
- **The route is unauthenticated.** The app asks on cold launch, before sign-in,
  and a build old enough to be blocked may not be able to authenticate against
  the current server at all. A session requirement would stop the gate doing the
  one thing it is for.

## Comparison

`isVersionBelow(current, min)` in `@brnit/domain` — **not semver**, on purpose.
A real semver parser *rejects* what it cannot classify, and in a gate a throw
means either a 500 on a public endpoint or failing closed and locking everyone
out. Instead every input maps to a `major.minor.patch` triple, so comparison is
total:

- only the first three segments are read; a 4th is ignored (`1.2.3.4` → `1.2.3`)
- missing segments are `0` (`"1"` → `1.0.0`)
- a non-numeric segment is `0` (`"1.2.3-beta"` → `1.2.0`)
- `""` is `0.0.0`, below every published version
- comparison is **strict**, so a user exactly on `minVersion` passes

One function, three call sites: the server's decision, the server's admin
validation, and the web form's client-side check. They cannot disagree.

## Configuring it

`/dashboard/admin/version-gate`, app-admin only. Four fields per platform:
minimum version, latest version, update message, store URL.

- `GET`/`PUT /api/v1/admin/version-gate` → `{ ios, android }`, `null` per
  platform meaning "no row", which the form renders as blank and unsaved.
- Both platforms are optional in the `PUT` body and an omitted one is left
  **untouched**, so saving iOS cannot clobber Android.
- `minVersion > latestVersion` is rejected. It is not merely odd, it is
  unsatisfiable: it blocks every build including the newest one in the store, so
  there is no version to update *to*. The issue is reported on `minVersion`,
  the field that was almost certainly mistyped.
- The two upserts and the read-back share one transaction, so the response can
  never show a half-applied save.

> `requireAdmin` answers **401**, not 403, for a signed-in non-admin. That is a
> pre-existing client-visible contract, not an oversight — don't "correct" it
> without changing the clients that branch on it.

## The native side

`VersionGateProvider` wraps the root navigator in `apps/native/app/_layout.tsx`
— not a single route. A gate mounted only on `index` stops blocking the moment
the user is anywhere else, which is precisely the state a retired build restores
into.

It checks on cold start and again on every `AppState` transition to `"active"`,
because a build can be retired while the app sits backgrounded for days.

**It fails open in both directions.** The starting state is `none`, so a cold
start never waits on the network to render, and a rejected check leaves the last
known decision untouched — an unreachable server can never brick the app. Note
the asymmetry: a failed check does not *clear* a standing block either, so going
offline is not a way out of one.

- `block` renders `UpdateBlockedScreen` **instead of** the navigator: no close,
  no back, no dismiss, one button to the store.
- `nudge` is a dismissible `Alert`, **throttled** to once per 24h per advertised
  release. A genuinely new build earns one interruption; the same one does not
  earn a fresh interruption on every foreground. The throttle lives inside
  `showUpdateNudge` so no call path can bypass it, and the marker is written
  before the alert opens so two checks in one tick cannot stack alerts.
- The block path never consults the throttle. Blocking always blocks.

## Testing it by hand

The app reports `expo.version` from `apps/native/app.json` (currently `1.0.0`).

```bash
docker exec brnit-postgres-1 psql -U brnit -d brnit -c \
  "INSERT INTO app_version_config (platform,min_version,latest_version,message,store_url,updated_at,updated_by)
   VALUES ('ios','2.0.0','2.0.0','Please update to continue.','https://apps.apple.com/app/id1',now(),'manual')
   ON CONFLICT (platform) DO UPDATE SET min_version=EXCLUDED.min_version, latest_version=EXCLUDED.latest_version;"
```

- `min 2.0.0` → **block**
- `min 1.0.0`, `latest 2.0.0` → **nudge**
- `min 1.0.0`, `latest 1.0.0` → **none**

`DELETE FROM app_version_config;` turns it off again.
