# brnit-app — API Surface & Business Rules

Inventory of the API as it exists in `apps/web/src/app/api/**` before the
overhaul. **Every endpoint here must survive the move to `apps/server` with
identical paths, semantics and response shapes**, except where a deviation is
explicitly agreed.

Paths below are relative to the old Next.js mount. On the new server they move
under `/api/v1` (better-auth stays unversioned at `/api/auth/*`).

---

## Conventions to preserve

- **Success (single):** `{ data: Entity }`
- **Success (list):** `{ data: T[], pagination: { page, perPage, totalItems, totalPages } }`
- **Delete:** `{ data: { deleted: true } }` or `{ data: deletedEntity }`, always 200
- **Error:** `{ error: string, details?: unknown }`; validation errors put zod
  `flattenError()` output (`{ formErrors, fieldErrors }`) in `details`
- Auth-helper errors return `{ message }` (401/403); `requireMemberOrg` adds
  `code` (`NO_ORGANIZATION` / `NOT_MEMBER`)
- **Pagination is offset-based.** `page` (default 1, ≥1), `perPage` (default 25,
  1–100, accepts `limit` as an alias), `q` (trimmed, ≤100), `sortOrder`
  (`asc|desc`, default `desc`). Page sizes offered in UI: `[10, 25, 50, 100]`.
- Every response carries `x-request-id`.

### Guards

| Guard | Passes when |
| --- | --- |
| `requireAuth` | any valid session |
| `requireAdmin` | `user.role === 'admin'` |
| `requireNutritionist` | app admin, **or** `user.role === 'nutritionist'` (no org needed), **or** org role `nutritionist` with an active org |
| `requireNutritionistOrgContext` | as above, but a global nutritionist without `activeOrgId` is rejected |
| `requireAssessmentWriteAuth` | (`isAppAdmin \|\| isOwner \|\| isDirectAdmin`) **and** `activeOrgId` set |
| `requireMemberOrg` | session + resolvable org membership; yields `memberId` |

---

## 1. Auth — `/api/auth/*`

GET + POST catch-all, public. Full better-auth handler. Provides email/password,
email verification, password reset, Google + Apple OAuth, the **admin** plugin
(`listUsers`, `setRole`, `banUser`, `unbanUser`, `removeUser`, `impersonateUser`,
`stopImpersonating`), the **organization** plugin (create/invite/accept/cancel/
list/remove/updateMemberRole/setActive), the **expo** plugin, and `openAPI()`.

Must be mounted **before** `express.json()`.

## 2. Users / me

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/users/me/organization-context` | any (returns unauthenticated shape without a session) | resolves active org + role flags |
| GET | `/api/me/profile` | `requireAuth` | `{ name, email, image, dob }` |
| PATCH | `/api/me/profile` | `requireAuth` | **multipart**: `name?`, `dob?` (YYYY-MM-DD, must be past), `file?` (≤5 MB; jpeg/png/webp/gif), `clearImage?='true'`. At least one field required. Uploads to Cloudinary folder `profile`, deletes the previous image, then `auth.api.updateUser`. |

## 3. Cloudinary

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/api/cloudinary/sign` | any session | `{ timestamp?, folder? }` → `{ signature, timestamp, cloudName, apiKey }`. Signs a direct browser upload. Available but **not** used by the main entity paths. |

## 4. Admin — `requireAdmin`

### Food categories
| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/admin/food-categories` | `sortBy: name\|createdAt` (default `name`). Search matches name **or** description (ilike). |
| POST | `/api/admin/food-categories` | `{ name ≤100, description? ≤2000 }` → 201 |
| GET | `/api/admin/food-categories/[id]` | |
| PATCH | `/api/admin/food-categories/[id]` | name required |
| DELETE | `/api/admin/food-categories/[id]` | ⚠️ no blocking-reference check — the `restrict` FK on the junction surfaces as a 500. **Should become a 409 in the rewrite.** |

### Food items
| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/admin/food-items` | `sortBy: name\|calories\|protein\|carbs\|fat\|createdAt` (default `createdAt`), `categoryId` uuid |
| POST | `/api/admin/food-items` | **multipart**: `name`, `categoryIds[]` (1–20 uuids, deduped, **required**), macros (coerced, ≥0, default 0), `unit` (default `100g`), `gramsPerUnit` (>0, **required when unit ≠ 100g**), `file?`. Cloudinary folder `food-items`. Category ids validated **before** upload. |
| GET | `/api/admin/food-items/[id]` | |
| PATCH | `/api/admin/food-items/[id]` | **multipart**, all optional + `clearImage`. **409** on blocking references. At least one field required. |
| DELETE | `/api/admin/food-items/[id]` | **409** on blocking references |

**Blocking references**: a food item cannot be edited or deleted while
referenced by any `meal_item`, `diet_plan_meal_item_override`, or
`diet_plan_meal_consumption_item`.

### Meals
| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/admin/meals` | `sortBy: name\|createdAt`; totals rounded to 2dp |
| POST | `/api/admin/meals` | `{ name ≤255, description? ≤500, mealItems?: [{foodItemId, quantity>0}] }` |
| GET | `/api/admin/meals/[id]` | items join food name, categories, macros, unit, gramsPerUnit |
| PATCH | `/api/admin/meals/[id]` | `{ name?, description?, add?, remove?, update? }`. **409** if the meal belongs to a plan that has any assignment. |
| DELETE | `/api/admin/meals/[id]` | **409** if it still has items, or if any `diet_plan_meal` references it |
| POST | `/api/admin/meals/[id]/clone` | 201 |

### Diet plans
| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/admin/diet-plans` | returns `slotCount` per plan |
| POST | `/api/admin/diet-plans` | `{ name, description?, dietPlanMeals?: [{mealId, dayNumber≥0, mealType ≤50, mealOrder≥1 default 1, scheduledTime? HH:mm}] }` |
| GET | `/api/admin/diet-plans/[id]` | plan + slots, each with `mealItems[]` |
| PATCH | `/api/admin/diet-plans/[id]` | **409** if the plan has any assignment |
| DELETE | `/api/admin/diet-plans/[id]` | **409** if the plan has any assignment |

## 5. Nutritionist

Read-only mirrors of the admin endpoints for **food categories** and **food
items** (`GET` list + detail only). Full CRUD for **meals** and **diet plans**
using the same schemas as admin. Plus:

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/nutritionist/diet-plan-assignments` | org context | `organizationId` forced to the active org. Each row carries future-only `mealTimeOverrides[]`. |
| POST | `/api/nutritionist/diet-plan-assignments` | org context | `{ memberId, dietPlanId, startDate, endDate, mealTimeOverrides?: [{dietPlanMealId, scheduledTime: 'HH:mm'\|null}] }`. 201 / **409 OVERLAP** / 404 / 400 |
| GET | `/api/nutritionist/diet-plan-assignments/[id]` | org context | non-admins get 404 if the assignment is outside the active org |
| PATCH | `/api/nutritionist/diet-plan-assignments/[id]` | org context | at least one of `startDate`/`endDate`/`mealTimeOverrides` |
| DELETE | `/api/nutritionist/diet-plan-assignments/[id]` | org context | cascades consumptions + overrides |
| GET | `/api/nutritionist/diet-plan-meal-consumptions` | org context | ⚠️ **not org-scoped** — any nutritionist can read any assignment's consumptions given the id. **Should be fixed in the rewrite.** |
| POST | `/api/nutritionist/diet-plan-meal-consumptions` | org context | 201 / 409 DUPLICATE / 400 |
| DELETE | `/api/nutritionist/diet-plan-meal-consumptions/[id]` | org context | |
| GET | `/api/nutritionist/body-composition-assessments` | org context | scoped via join on `member.organizationId`; read-only |

## 6. Direct admin — `requireAssessmentWriteAuth`

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/direct-admin/body-composition-assessments` | org-scoped, `imageUrl` computed |
| POST | `/api/direct-admin/body-composition-assessments` | **multipart**: `memberId`, `assessedAt` (ISO), `heightCm` 0–999.99, `bodyFatPercent` 0–100, `weightKg` 0–999.99, `bmi` 0–99.99, `muscleMassKg` 0–999.99, `visceralFatAreaCm2` 0–9999.99, `bodyWaterL` 0–999.99, `file?`. 201 / 404 / **403 WRONG_ORG** / 400 |
| GET | `/api/direct-admin/body-composition-assessments/[id]` | 403 if outside active org |
| PATCH | `/api/direct-admin/body-composition-assessments/[id]` | **multipart** partial + `clearImage` (`'1'`/`'true'`) |
| DELETE | `/api/direct-admin/body-composition-assessments/[id]` | deletes the Cloudinary asset first |

Cloudinary folder: `body-composition-assessments`.

## 7. Member — `/api/member/me/**`

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/member/me/current-diet-plan` | `requireAuth` | `?from&?to` (from ≤ to, range 1–31 days). Defaults `from = today (UTC)`, `to = from + 6d`. **The core member read** — see §8.2 |
| GET | `/api/member/me/diet-plan-assignments` | `requireAuth` | all assignments for the user (direct `userId` **or** any of their `member` rows), ordered by `startDate` asc |
| GET | `/api/member/me/diet-plan-meal-consumptions` | `requireAuth` | ownership enforced when `dietPlanAssignmentId` is given (403 otherwise); without it, restricted to the user's own assignment ids |
| POST | `/api/member/me/diet-plan-meal-consumptions` | `requireAuth` | `{ dietPlanAssignmentId, dietPlanMealId, consumedAt, consumedItems?: [{foodItemId, quantity>0}] (≤50), usePlannedItems? }`. 201 / 403 / 409 DUPLICATE / 400 |
| DELETE | `/api/member/me/diet-plan-meal-consumptions` | `requireAuth` | `{ dietPlanAssignmentId, dietPlanMealId, consumedDate }` — unmark by slot |
| GET | `/api/member/me/consumption-streak` | `requireAuth` | `{ streak: number }` |
| GET | `/api/member/me/organization-leaderboard` | `requireMemberOrg` | `?orgId?`. 400 `NO_ORGANIZATION` / 403 `NOT_MEMBER` |
| GET | `/api/member/me/food-categories` | `requireAuth` | flat, unpaginated, sorted by name |
| GET | `/api/member/me/food-items` | `requireAuth` | paginated, same service as admin |
| GET | `/api/member/me/food-items/[foodItemId]/alternatives` | `requireAuth` | `?quantity` (**required**, >0, ≤10000), `page?`, `perPage?` (1–20, default 10) |
| GET | `.../diet-plan-assignments/[assignmentId]/meal-entries/[dietPlanMealId]/items/[mealItemId]/alternatives` | `requireAuth` | `?page?, perPage?, date?`. Resolves the *displayed* food+quantity for that slot on `date` (override-aware) before running the algorithm |
| PUT/PATCH | `.../items/[mealItemId]/override` | `requireAuth` | `{ overrideId?, foodItemId, quantity>0, scope: 'single_day'\|'rest_of_plan', startDate }`. 201 created / 200 updated |
| DELETE | `.../items/[mealItemId]/override` | `requireAuth` | `?date=` removes that day from the newest matching row; without it deletes **all** rows for the slot |
| GET | `/api/member/me/body-composition-assessments/recent` | `requireMemberOrg` when `orgId` present, else `requireAuth` | `?orgId?`, `?limit?` (default 5, 1–20) |
| GET | `/api/member/me/body-composition-assessments/[id]` | `requireMemberOrg` | `?orgId` **required**; 404 if not found **or** not owned |

---

## 8. Business rules

### 8.1 Roles & organizations

**App roles** (`user.role`, admin plugin, `defaultRole: 'user'`): `admin`,
`nutritionist`, `coach`, `user`.

**Org roles** (`member.role`): `owner`, `client_admin`, `direct_admin`,
`nutritionist`, `coach`, `member`.

- Creating an organization requires `user.role === 'admin'`. The creator becomes
  `owner`. `membershipLimit: 100`.
- **Invitations**: app admin may invite with any role. Otherwise, inviting with
  a role other than `member` requires the inviter's **org** role to be `owner`
  or `direct_admin`. Every invitation expires in 7 days.
- **Role updates**: app admin, or actor org role in `owner` / `direct_admin`.
- Invitation link: `{CORS_ORIGIN or BETTER_AUTH_URL origin}/accept-invitation?invitationId=`.
  Native deep link: `brnit://accept-invitation?invitationId=`.

> ⚠️ **Known divergence to resolve.** The auth package gates non-member invites
> on `owner`/`direct_admin`, while the web helper `hasOrgInvitePermission`
> allows `owner`/`client_admin` to open the invite UI. The backend hook is
> authoritative; the client gate should be corrected to match.

**`OrganizationContext`** resolution order: no session → all flags false;
`user.role === 'admin'` → `isAppAdmin`, `role: null`, keeps `activeOrgId`; else
`session.activeOrganizationId` → look up membership + org (both must exist);
else if the user has **exactly one** membership → auto-adopt it; else null.

### 8.2 Current diet plan (the member Home read)

```
today = todayUtc; from ??= today; to ??= from + 6d
memberIds = all member.id for userId
rows = assignments where (userId = me OR memberId IN memberIds) ORDER BY startDate ASC
if none -> { data: null }
assignment = first row covering `from`, else rows[0]
allDates = every date in [from..to] ∩ [assignment.startDate..assignment.endDate]
if allDates empty -> { data: null }

for each date:
  planDay   = inclusive UTC day-diff(assignment.startDate, date)   # day 1 = startDate
  overrides = resolveOverridesForDate(overrideRows, date)
  mealTimes = resolveMealTimeOverridesForDate(timeRows, date)
  meals     = planMeals.filter(dayNumber === 0 || dayNumber === planDay)
                       .sort(mealOrder, then mealType lexicographic, then id)
  per item:
    override = overrides[`${dietPlanMealId}:${mealItemId}`]
    foodItemId/quantity = override ?? plan values
    macros = ceilToTenth(factor(quantity, unit) * perUnitMacros)   # missing food -> zeros, unit '100g'
    if overridden: also emit originalFoodItemId/Name/Quantity/Unit and isOverridden: true
  meal.macros        = ceilToTenth(sum of item macros)
  meal.consumed      = consumptionMap has `${dietPlanMealId}:${date}`  (+ consumedAt ISO)
  meal.scheduledTime = mealTimeOverride ?? slot.scheduledTime ?? undefined
  day.macros         = ceilToTenth(sum of meal macros)
```

All date math is **UTC calendar dates**.

> **Two different rounding rules coexist and both are load-bearing.**
> Persisted `meal.total_*` rounds **once at the end, to 2dp**
> (`Math.round(v*100)/100`). Everything the member sees — per item, per meal,
> per day — rounds **up to the nearest tenth at every step**
> (`Math.ceil(v*10)/10`). Do not unify them.

### 8.3 Diet plan assignment

**Create:**
1. If `organizationId` is present → `memberId` required, `userId` forbidden
   (400). Member must exist (404), belong to that org (404), and have
   **`member.role === 'member'`** (400 — staff cannot be assigned plans).
2. Plan must exist (404). Resolve `assigneeUserId`.
3. **Overlap check**: gather *all* `member.id` rows for that user across **every
   organization**, then reject if any assignment where
   `(userId = target OR memberId IN thatSet)` satisfies
   `startDate <= newEnd AND endDate >= newStart` → **409 OVERLAP**. A person has
   at most one plan covering any given day, org-wide.
4. Transaction: insert assignment, then save meal-time overrides.

**Update:** merge with existing dates, re-validate `start <= end`, re-run the
overlap check **excluding itself**, then transactionally update.

**Meal-time overrides:** validate every `dietPlanMealId` belongs to the
assignment's plan; delete all future-only rows (`effectiveDate IS NULL`) for
those meals; insert the ones with non-null `scheduledTime`. So
`scheduledTime: null` means "clear the override, fall back to the plan default".

**Resolution for a date:** an exact-date row wins; otherwise a future-only row
applies only when `date >= today (UTC)`; otherwise the plan's own
`scheduledTime`.

### 8.4 Food-item alternatives

```
limit = clamp(perPage, 1, 20); offset = (page-1)*limit
load reference food + its category ids
404 REFERENCE_NOT_FOUND if missing
400 REFERENCE_INVALID if any macro is NULL or it has no categories
factorRef = refUnit === '100g' ? quantity/100 : quantity
R = factorRef * perUnitMacros
tolerances from env, default 15, clamped 1..100:
   ALTERNATIVES_TOLERANCE_{CAL,PROTEIN,CARBS,FAT}_PCT   # CAL is parsed but NOT used as a filter

candidates = food items != reference, all macros NOT NULL,
             sharing at least one category with the reference
per candidate:
   skip if candidate.calories <= 0
   factor = R.cal / candidate.calories          # match on CALORIES exactly
   keep only if each of protein/carbs/fat is within R.x * (1 ± tol_x/100)
   suggestedQuantity = snapMealQuantityToStep(
       candidateUnit === '100g' ? round(factor*1000)/10 : round(factor*10)/10,
       candidateUnit)
   totals = factor * candidate macros; deltas = totals - R
   all reported macros/deltas rounded to 1 decimal
sort by |candidate.calories - R.cal| ascending
paginate in memory; totalItems = full match count
```

**Quantity snapping**: step = `100g → 50`, `piece → 1`,
`liters|cup|tbsp → 0.5`. Snap to nearest step, round to the step's decimals,
clamp to `min = step`.

### 8.5 Meal-item overrides (member food swaps)

The trickiest logic in the app. Model: **multiple override rows per slot** (one
per alternative food), each owning a mutable set of `effectiveDates`.

**Upsert:**
1. Authorize the assignment (direct `userId` or via any `member` row) → 403.
2. Validate `dietPlanMeal` belongs to the plan (404), `foodItem` exists (400),
   `mealItem` belongs to that plan meal's `mealId` (404).
3. Normalize scope → dates:
   - `single_day` → `[startDate]` (may be in the past).
   - `rest_of_plan` → start = `max(startDate, todayUTC)` (**never backdates**),
     expand inclusively through `assignment.endDate`; empty set → 400.
   - Always deduped + lexicographically sorted.
4. Transaction:
   - `overrideId` given → update that exact row, **replacing** `effectiveDates`.
   - Else find the row for `(assignment, meal, mealItem, foodItemId)`. Found →
     **merge** old ∪ new dates (so earlier days aren't clobbered). Absent →
     insert.
   - Always write `intentScope` + `intentStartDate` alongside.
5. PG unique violation (`23505`) → 400.

**Resolution for a date:** for each slot key `${dietPlanMealId}:${mealItemId}`,
consider only rows whose `effectiveDates` include `date`; **the row with the
greatest `updatedAt` wins**. This is how different foods occupy the same slot on
different days.

**Delete:** without `date`, delete every row for the slot (404 if none). With
`date`, order rows by `updatedAt desc`, find the **first** row containing that
date, remove it; delete the row if the set becomes empty (404 if no row covers
it).

### 8.6 Meal consumption & streak

**Log consumption:**
1. Filter `consumedItems` to positive quantities.
2. `consumedDate = consumedAt.toISOString().slice(0,10)`. **Backdate guard**:
   reject if `> today` or `< today - MAX_CONSUMPTION_PAST_DAYS` (default 2,
   clamped 0–365) → `OUT_OF_ALLOWED_DATE_RANGE`.
3. If `usePlannedItems` and no explicit items → resolve the slot's planned items
   for that date (override-aware) and snapshot `{foodItemId, quantity}`.
   Slot not found → `INVALID_SLOT`.
4. Duplicate probe on `(assignment, dietPlanMeal, consumedDate)` → **409
   DUPLICATE**; existence check for every distinct `foodItemId` →
   `INVALID_CONSUMED_ITEMS` listing the missing ids.
5. Transaction: insert consumption + items.

**Two layered date rules** both apply on the member POST: the route-level
assignment window `[startDate, endDate + DIET_PLAN_CONSUMPTION_GRACE_DAYS]`
(default 2), then the service-level `[today - MAX_CONSUMPTION_PAST_DAYS, today]`.

> ⚠️ The server computes dates in **UTC**; native pre-checks eligibility in
> **device-local** time and posts `consumedAt` at **12:00 local** to dodge
> timezone edges. Preserve this convention or fix it deliberately — do not
> change one side alone.

**Streak:**
```
assignmentIds = all assignments for (userId OR user's member ids); none -> 0
consumedDates = DISTINCT consumed_date for those assignments, >= today-365
if today ∉ consumedDates -> 0        # not logging today breaks it immediately
streak = 0; cursor = today
while cursor ∈ consumedDates: streak++; cursor -= 1 day
```
UTC dates. One logged meal counts a day.

### 8.7 Organization leaderboard

```
members = org members with role === 'member'
assessments for those memberIds ORDER BY memberId, assessedAt ASC
for each member with >= 2 assessments:
   fatLossPoints = firstAssessment.bodyFatPercent - lastAssessment.bodyFatPercent
sort: fatLossPoints DESC, then endAssessedAt, then memberId ASC
rank = index + 1; top = first 3
self = the requester's entry, or { rank: null, eligibility: 'not_enough_assessments' }
```

Metric label is the literal `'bodyFatPercentPointDrop'`. Positive = fat lost.
Missing user name → `'Unknown'`. Invalid numerics parse to 0. Only members with
role exactly `member` compete.

> **Correction.** An earlier draft of this document claimed the tiebreaker's
> date comparison was inverted relative to its comment. That was wrong — it was
> verified empirically against the source during the port. The comparator reads
> `const tA = b.endAssessedAt; const tB = a.endAssessedAt; return tA - tB`,
> which is `b - a`: **descending, so the newest latest-assessment ranks
> higher**, exactly as its comment says. No change was needed and none was
> made.

### 8.8 Meal cloning

One transaction: read header + lines (ordered `createdAt asc`) → 404 if missing
→ insert a meal named `"{name} clone"`, truncating the base so the total stays
≤ 255 chars (base kept ≥ 1 char) → copy the lines → recompute totals.
`diet_plan_meal` is never touched, so the clone belongs to no plan.

### 8.9 Diet plans

- `listDietPlans` computes `slotCount` via LEFT JOIN + GROUP BY.
- `getDietPlanById` loads header + slots (ordered `dayNumber, mealType,
  mealOrder`), then **one batched query** for all `meal_item` rows across the
  involved meals, grouped in memory.
- `updateDietPlan` / `deleteDietPlan` both refuse with **409** when the plan has
  any assignment — assigned plans are immutable and undeletable.
- Mutations run in FK-safe order: metadata → remove → patch → add, in one
  transaction.

> `getDietPlanSlotsForMember` (groups slots into "pick one of these meals"
> alternatives) is implemented but **unrouted**. Decide whether to wire or drop
> it.

### 8.10 Body composition assessments

- Create: member must exist (404) and belong to the caller's active org
  (**403 WRONG_ORG**); optional Cloudinary upload; `recordedById = session.user.id`.
- List: org-scoped via `INNER JOIN member ON member.organizationId = activeOrg`.
- Update/Delete: `assessmentBelongsToOrg` + row fetch in parallel; map to
  403 WRONG_ORG / 404 NOT_FOUND. Delete removes the Cloudinary asset first.
- Member-facing readers normalize numerics to `number | null` and attach
  `organization`.
- **Account deletion hook**: `user.deleteUser.beforeDelete` deletes every
  assessment where `recordedById = user.id` before removing the user, because
  that FK is `NO ACTION`. **This must be preserved.**

---

## 9. Cross-cutting

### Audit logging

Enabled only when `AUDIT_LOG_DB_ENABLED === 'true'` **and** the method is one of
POST/PUT/PATCH/DELETE. Fire-and-forget — never awaited, failures logged not
thrown.

Recorded: `requestId`, `actionName` (explicit, or derived as
`Get|Create|Update|Delete` + TitleCased first path segment after `/api/`),
`resource`, `endpoint` (pathname, no query), `requestMethod`, `statusCode`,
`success` (`<400`), `durationMs`, `userId`/`userRole`, `organizationId`
(**only from the `?orgId=` query param**), `ip` (first `x-forwarded-for`, else
`x-real-ip`), `userAgent`, `message` (`null` on success, else
`Request failed (NNN)`). Bodies and auth headers are never stored.

The logger redacts keys matching
`authorization|cookie|set-cookie|token|password|apikey|api_key|secret` and
depth-limits at 6.

### Cloudinary

**Server-side upload is the path actually used for entities.** Client posts
`multipart/form-data` with `file`; the route streams it to Cloudinary, stores
only `public_id` in the DB, and returns
`imageUrl = https://res.cloudinary.com/{cloud}/image/upload/{publicId}`.
Replacement always deletes the old asset first; `clearImage` deletes and nulls
the column. Folders: `food-items`, `body-composition-assessments`, `profile`.

**Profile is the exception** — it stores the **full URL** on `user.image` and
extracts the public id from that URL to delete the old asset.

### Email

Three flows, all through one Brnit-branded HTML template (primary `#FD6E20`)
over Nodemailer (`secure: true`, port `NODEMAILER_PORT ?? 465`):

| Flow | Trigger | Notes |
| --- | --- | --- |
| Email verification | `sendOnSignUp: true`, `requireEmailVerification: true` | expires 24 h; `autoSignInAfterVerification: true` |
| Password reset | `requestPasswordReset` | web `redirectTo: '/reset-password'`; native `brnit://reset-password` |
| Org invitation | `inviteMember` | subject "You're invited to join {org}"; expires 7 days |

Missing config throws an explicit "[Brnit] Email is not configured" error.

### Environment variables

Currently declared in `@burn-app/env`: `DATABASE_URL`, `BETTER_AUTH_SECRET`,
`BETTER_AUTH_URL`, `CORS_ORIGIN`, `NODE_ENV`, `NODEMAILER_HOST|USER|APP_PASSWORD|PORT`,
`GOOGLE_CLIENT_ID|SECRET`, `APPLE_CLIENT_ID|TEAM_ID|KEY_ID|PRIVATE_KEY|APP_BUNDLE_IDENTIFIER`;
native: `EXPO_PUBLIC_SERVER_URL`, `EXPO_PUBLIC_MAX_CONSUMPTION_PAST_DAYS`.

Read directly from `process.env` today and **must be moved into `@brnit/env`**:
`CLOUDINARY_CLOUD_NAME|API_KEY|API_SECRET`, `AUDIT_LOG_DB_ENABLED`,
`LOG_HTTP|LOG_LEVEL|LOG_COLOR|LOG_STACKS`, `MAX_CONSUMPTION_PAST_DAYS`,
`DIET_PLAN_CONSUMPTION_GRACE_DAYS`,
`ALTERNATIVES_TOLERANCE_{CAL,PROTEIN,CARBS,FAT}_PCT`.

New for the overhaul: `PORT`, `REDIS_URL`, `FIREBASE_PROJECT_ID`,
`FIREBASE_SERVICE_ACCOUNT_JSON`, `OTEL_EXPORTER_OTLP_ENDPOINT`.

The Apple client secret is generated at module load: an ES256 JWT signed with
the `.p8` key, 180-day expiry.

---

## 10. Client surface (must keep working)

### Web screens

`/`, `/login`, `/signup`, `/forgot-password`, `/reset-password`,
`/accept-invitation`, `/complete-profile`, `/dashboard`,
`/dashboard/organizations` (+ `/[id]`, `/[id]/members/[memberId]`),
`/dashboard/admin` (users, categories, food-items, meals, diet-plans — each with
detail pages), `/dashboard/nutritionist` (categories + food-items read-only;
meals + diet-plans full CRUD), `/dashboard/direct-admin/members` (+ `/[memberId]`).

Sidebar shows Dashboard + Organizations always; the Admin group when
`user.role === 'admin'`; Direct Admin and Nutritionist groups by their
respective access predicates.

### Native screens

```
Stack (root)
├── index                  gatekeeper redirect
├── accept-invitation      deep link brnit://accept-invitation?invitationId=
├── (onboarding)           index
├── (auth)                 index | login | sign-up | complete-profile
│                          | forgot-password | reset-password
├── (tabs)                 index (Home) | search | stats | profile
└── modal
```

Native tab bar is hidden in favour of a custom floating `BottomNav`.

| Screen | Content |
| --- | --- |
| Home | greeting header, horizontal calendar strip (fling gestures change day), calorie ring + macro bars + streak badge, per-meal cards, meal-item detail sheet |
| Search | debounced food search, filter sheet (category/sort, zustand-persisted), active-filter chips, `FlashList` infinite scroll (perPage 20), alternatives sheet |
| Stats | org picker (auto-`setActive` when the user has exactly one org), recent assessments + detail sheet, leaderboard (top 3 + self), current streak |
| Profile | avatar/name/email, theme card, settings rows, edit-profile sheet, delete account, sign out |

Native networking: `apiFetch` prefixes `EXPO_PUBLIC_SERVER_URL`, sends
`Cookie: authClient.getCookie()`, `credentials: 'omit'`, JSON unless FormData,
throws `ApiError(status, message, details)` parsed from `{error, details}`.

> `Notifications`, `Goals`, and `Help & Support` profile rows are inert
> placeholders today. **Notifications becomes real** now that push is in scope.
