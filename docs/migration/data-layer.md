# brnit-app — Data Layer Reference

> Authoritative reference for the `@brnit/db` package during the stack overhaul.
> **Decision: the project stays on Drizzle ORM.** This document records why, and
> captures the schema facts every implementer needs.

## Why we did not port to Prisma

The stack overhaul moves the repo to Bun, a standalone Express API, a shared
design system and four new infra subsystems. Re-ORMing on top of that was
evaluated and rejected — it is the single largest source of data risk in the
project and buys no capability we need:

| Blocker | Detail |
| --- | --- |
| CHECK constraints | Four in production. Prisma cannot express any of them in `schema.prisma`; all would have to be hand-maintained in raw migration SQL or silently vanish. |
| `numeric` precision | Bare `numeric` columns map to Prisma `Decimal(65,30)`, emitting a type change on live columns. |
| `date` semantics | Drizzle reads `date` as `'YYYY-MM-DD'` strings. Prisma returns `DateTime`. Every date comparison in override resolution would need rewriting. |
| `jsonb` typing | `effective_dates` is `string[]` via Drizzle `$type<>()`. Prisma gives untyped `Json`; the contract becomes runtime-only. |
| Constraint naming | Drizzle and Prisma use different default names. First `migrate diff` would churn every constraint in the database. |
| Enum extension | `ALTER TYPE ... ADD VALUE` cannot run inside a transaction; Prisma wraps migrations in one. |

The `db` package is still restructured to match the monorepo's package
conventions (explicit `exports` map, workspace dependencies, `db:*` scripts) so
it is architecturally consistent with the rest of the tree.

---

## Overview

- **Dialect:** PostgreSQL
- **ORM:** `drizzle-orm` over `node-postgres`
- **21 tables · 1 enum · 24 migrations (0000–0023)**
- Schema sources: `packages/db/src/schema/*.ts`
- `schema/index.ts` does **not** export `food-item-category` or `food-item-table`
  directly — they are re-exported through `schema/food-item.ts`.

---

## 1. Tables

### 1.1 `user` (better-auth)

| Column | Type | Null | Default | Key |
| --- | --- | --- | --- | --- |
| `id` | `text` | NO | — | **PK** |
| `name` | `text` | NO | — | |
| `email` | `text` | NO | — | UNIQUE `user_email_unique` |
| `email_verified` | `boolean` | NO | `false` | |
| `image` | `text` | YES | — | |
| `created_at` | `timestamp` | NO | `now()` | |
| `updated_at` | `timestamp` | NO | `now()` + `$onUpdate` | |
| `role` | `text` | YES | — | admin plugin |
| `banned` | `boolean` | YES | — | admin plugin |
| `ban_reason` | `text` | YES | — | admin plugin |
| `ban_expires` | `timestamp` | YES | — | admin plugin |
| `dob` | `date` | YES | — | the only `additionalFields` entry |

### 1.2 `organization` (better-auth)

| Column | Type | Null | Default | Key |
| --- | --- | --- | --- | --- |
| `id` | `text` | NO | — | **PK** |
| `name` | `text` | NO | — | |
| `slug` | `text` | NO | — | UNIQUE `organization_slug_unique` |
| `logo` | `text` | YES | — | |
| `created_at` | `timestamp` | NO | `now()` | |

### 1.3 `session` (better-auth)

| Column | Type | Null | Default | Key |
| --- | --- | --- | --- | --- |
| `id` | `text` | NO | — | **PK** |
| `expires_at` | `timestamp` | NO | — | |
| `token` | `text` | NO | — | UNIQUE `session_token_unique` |
| `created_at` | `timestamp` | NO | `now()` | |
| `updated_at` | `timestamp` | NO | **no DB default** | |
| `ip_address` | `text` | YES | — | |
| `user_agent` | `text` | YES | — | |
| `user_id` | `text` | NO | — | FK → `user.id` CASCADE |
| `impersonated_by` | `text` | YES | — | no FK |
| `active_organization_id` | `text` | YES | — | FK → `organization.id` SET NULL |

Index: `session_userId_idx` (`user_id`).

### 1.4 `account` (better-auth)

`id` PK; `account_id`, `provider_id` NOT NULL; `user_id` FK → `user.id` CASCADE;
`access_token`, `refresh_token`, `id_token`, `scope`, `password` nullable text;
`access_token_expires_at`, `refresh_token_expires_at` nullable timestamps;
`created_at` default `now()`; `updated_at` NOT NULL, **no DB default**.
Index: `account_userId_idx` (`user_id`).

### 1.5 `verification` (better-auth)

`id` PK; `identifier`, `value` NOT NULL text; `expires_at` NOT NULL;
`created_at`/`updated_at` default `now()`. Index: `verification_identifier_idx`.

### 1.6 `member` (organization plugin)

`id` PK; `organization_id` FK → `organization.id` CASCADE; `user_id` FK →
`user.id` CASCADE; `role` text NOT NULL default `'member'`; `created_at`
default `now()`.

> **No unique constraint on `(organization_id, user_id)`** — duplicates are
> possible at the DB level. Do not add one without deduping first.

### 1.7 `invitation` (organization plugin)

`id` PK; `organization_id` FK CASCADE; `email` NOT NULL; `role` nullable;
`status` NOT NULL default `'pending'`; `expires_at` NOT NULL; `inviter_id` FK →
`user.id` CASCADE; `created_at` default `now()` (added in migration 0001).

### 1.8 `food_category`

| Column | Type | Null | Default | Key |
| --- | --- | --- | --- | --- |
| `id` | `text` | NO | app `crypto.randomUUID()` | **PK** |
| `name` | `text` | NO | — | UNIQUE `food_category_name_unique` |
| `description` | `text` | YES | — | added 0021 |
| `created_at` | `timestamp` | NO | `now()` | |

No `relations()` declaration exists for this table.

### 1.9 `food_item`

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| `id` | `text` | NO | app UUID (**PK**) |
| `name` | `text` | NO | — |
| `calories` | `numeric` | NO | `'0'` |
| `protein` | `numeric` | NO | `'0'` |
| `carbs` | `numeric` | NO | `'0'` |
| `fat` | `numeric` | NO | `'0'` |
| `unit` | `food_item_unit` | NO | `'100g'` |
| `grams_per_unit` | `numeric` | YES | — |
| `image_public_id` | `text` | YES | — |
| `created_at` | `timestamp` | NO | `now()` |
| `updated_at` | `timestamp` | NO | `now()` + `$onUpdate` |

**Semantics:** macros are stored **per 1 unit**. `unit='100g'` ⇒ macros are per
100 g and `quantity` is grams; any other unit ⇒ macros are per 1 unit and
`quantity` is a count of units. `grams_per_unit` is the gram equivalence.

### 1.10 `food_item_category` (n–n join)

Composite PK `(food_item_id, food_category_id)`, named
`food_item_category_food_item_id_food_category_id_pk`.
`food_item_id` FK → `food_item.id` **CASCADE**;
`food_category_id` FK → `food_category.id` **RESTRICT**.
Index: `food_item_category_category_idx` (`food_category_id`).
No surrogate id, no timestamps.

### 1.11 `meal`

`id` PK; `name` NOT NULL; `description` nullable;
`total_calories` / `total_protein` / `total_carbs` / `total_fat` `numeric` NOT
NULL default `'0'`; `created_at`, `updated_at`.

> The four `total_*` columns are **application-maintained denormalized
> aggregates**. There is no trigger. See §4.

### 1.12 `meal_item`

`id` PK; `meal_id` FK → `meal.id` CASCADE; `food_item_id` FK → `food_item.id`
**RESTRICT / RESTRICT**; `quantity` `numeric` NOT NULL; `created_at`.
Indexes: `meal_item_meal_idx`, `meal_item_food_idx`.

### 1.13 `diet_plan`

`id` PK; `name` NOT NULL; `description` nullable; `created_at`, `updated_at`.

### 1.14 `diet_plan_meal`

`id` PK; `diet_plan_id` FK → `diet_plan.id` CASCADE; `meal_id` FK → `meal.id`
**RESTRICT**; `day_number` `integer` NOT NULL; `meal_type` `text` NOT NULL
(free text, not an enum); `meal_order` `integer` NOT NULL default `1`;
`scheduled_time` `text` nullable (`HH:MM`, not a `time` column); `created_at`.

Indexes: `diet_plan_meal_plan_idx`; `diet_plan_meal_day_idx`
(`diet_plan_id`,`day_number`); `diet_plan_meal_slot_idx`
(`diet_plan_id`,`day_number`,`meal_type`,`meal_order`).

**Semantics:** `day_number = 0` ⇒ the meal repeats every day of the plan;
`>= 1` ⇒ day-specific.

### 1.15 `diet_plan_assignment`

`id` PK; `member_id` **nullable** FK → `member.id` CASCADE; `user_id`
**nullable** FK → `user.id` CASCADE; `diet_plan_id` FK → `diet_plan.id`
**RESTRICT** (changed from CASCADE in 0016); `start_date`, `end_date` `date`
NOT NULL; `created_at`.

Indexes: `..._member_idx`, `..._user_idx`, `..._plan_idx`.

**CHECK constraints:**

- `diet_plan_assignment_assignee_check` — XOR assignee:
  `((member_id IS NOT NULL AND user_id IS NULL) OR (member_id IS NULL AND user_id IS NOT NULL))`
- `diet_plan_assignment_date_range_check` — `start_date <= end_date`

### 1.16 `diet_plan_meal_consumption`

`id` PK; `diet_plan_assignment_id` FK CASCADE; `diet_plan_meal_id` FK CASCADE;
`consumed_at` `timestamp` NOT NULL; `consumed_date` `date` NOT NULL;
`created_at`.

Indexes: `..._assignment_idx`, `..._meal_idx`, and **UNIQUE**
`diet_plan_meal_consumption_unique_idx`
(`diet_plan_assignment_id`, `diet_plan_meal_id`, `consumed_date`).

### 1.17 `diet_plan_meal_consumption_item`

`id` PK; `diet_plan_meal_consumption_id` FK CASCADE; `food_item_id` FK →
`food_item.id` **RESTRICT / RESTRICT**; `quantity` `numeric` NOT NULL;
`created_at`. Index: `..._consumption_idx`.

### 1.18 `diet_plan_meal_item_override`

`id` PK; `diet_plan_assignment_id` FK CASCADE; `diet_plan_meal_id` FK CASCADE;
`meal_item_id` FK → `meal_item.id` CASCADE; `food_item_id` FK → `food_item.id`
**RESTRICT / RESTRICT**; `quantity` `numeric` NOT NULL; `intent_scope` text
nullable; `intent_start_date` `date` nullable; `effective_dates` `jsonb` NOT
NULL default `'[]'::jsonb` (TS type `string[]`); `created_at`, `updated_at`.

Indexes: `..._assignment_idx`; `..._assignment_meal_idx`; `..._slot_idx`
(`assignment`,`meal`,`meal_item`); **UNIQUE** `..._slot_food_item_unique_idx`
(`assignment`,`meal`,`meal_item`,`food_item`).

**CHECK constraints:**

- `diet_plan_meal_item_override_intent_scope_check`:
  `(intent_scope IS NULL AND intent_start_date IS NULL) OR (intent_scope = 'single_day' AND intent_start_date IS NOT NULL) OR (intent_scope = 'rest_of_plan' AND intent_start_date IS NOT NULL)`
- `diet_plan_meal_item_override_effective_dates_array_check`:
  `jsonb_typeof(effective_dates) = 'array'`

**Semantics:** `effective_dates` is the canonical runtime resolver — a snapshot
of unique `YYYY-MM-DD` dates the override applies to. `intent_scope` /
`intent_start_date` are audit + edit-UX metadata only.

### 1.19 `diet_plan_meal_time_override`

`id` PK; `diet_plan_assignment_id` FK CASCADE; `diet_plan_meal_id` FK CASCADE;
`scheduled_time` text NOT NULL; `effective_date` `date` **nullable**;
`created_at`, `updated_at`.

Indexes: `..._assignment_idx`, `..._assignment_meal_idx`, **UNIQUE**
`..._unique_idx` (`assignment`, `meal`, `effective_date`).

**Semantics:** `effective_date IS NULL` ⇒ "future only" (applies when the
resolution date `>= today`); non-null ⇒ that date only. Because Postgres
uniqueness is NULLS-DISTINCT by default, the "future only" row is **not**
deduplicated by the unique index. This is intentional — do not "fix" it.

### 1.20 `body_composition_assessment`

`id` PK; `member_id` FK → `member.id` **CASCADE**; `assessed_at` timestamp NOT
NULL; `recorded_by_id` FK → `user.id` **NO ACTION**; `height_cm`
`numeric(5,2)`; `body_fat_percent` `numeric(5,2)`; `weight_kg` `numeric(5,2)`;
`bmi` `numeric(4,2)`; `muscle_mass_kg` `numeric(5,2)`;
`visceral_fat_area_cm2` `numeric(6,2)`; `body_water_l` `numeric(5,2)` — all NOT
NULL; `image_public_id` nullable; `created_at`, `updated_at`.

Indexes: `..._member_idx`, `..._assessed_at_idx`, `..._recorded_by_idx`.

> Because `recorded_by_id` is `NO ACTION`, better-auth's `deleteUser.beforeDelete`
> hook manually deletes these rows. **That application-side cascade must be
> preserved in the new auth package.**

### 1.21 `audit_log`

`id` PK; `request_id` NOT NULL; `user_id`, `user_role`, `organization_id`,
`member_id` nullable (**no FKs**); `action_name` NOT NULL; `resource`,
`endpoint` nullable; `request_method` NOT NULL; `status_code` `integer` NOT
NULL; `success` `boolean` NOT NULL; `ip`, `user_agent` nullable; `duration_ms`
`integer` nullable; `message` nullable; `created_at`.

Indexes: `audit_log_createdAt_idx`, `audit_log_requestId_idx`,
`audit_log_userId_idx`, `audit_log_organizationId_idx`.

> **Deliberately FK-free** for retention/privacy — the log survives user
> deletion. Do not add relations here.

---

## 2. Enums

Exactly one `pgEnum` in the schema.

| Enum | PG name | Values (declaration order matters for sorts) | Used by |
| --- | --- | --- | --- |
| `foodItemUnitEnum` | `public.food_item_unit` | `'100g'`, `'piece'`, `'liters'`, `'cup'`, `'tbsp'` | `food_item.unit` |

Created in 0013 as `('100g','piece')`; `'liters'` appended in 0017; `'cup'` and
`'tbsp'` in 0018.

All other enum-like columns are plain `text` with **no DB constraint**:
`user.role`, `member.role`, `invitation.role`, `invitation.status`,
`diet_plan_meal.meal_type`, and `diet_plan_meal_item_override.intent_scope`
(constrained only by its CHECK).

---

## 3. Many-to-many

Exactly one join table — `food_item_category` linking `food_item` ⟷
`food_category`. It is an **explicit** join model (composite PK, no surrogate
id, no timestamps).

---

## 4. `meal-totals.ts` — denormalized aggregate maintenance

`packages/db/src/meal-totals.ts` is pure (no DB access) and keeps
`meal.total_*` in sync with the arithmetic the UI summary card uses, so
persisted values and rendered summaries never diverge.

Constants: `MACRO_DECIMAL_PLACES = 2`, `MACRO_SCALE = 100`.

| Function | Behavior |
| --- | --- |
| `getMacroFactor(quantity, unit)` | `unit === '100g' ? quantity / 100 : quantity` |
| `roundNutritionMacro(value)` | `Math.round(value * 100) / 100` |
| `computeMealTotalsFromLineItems(items)` | Accumulates `factor * macro` as **raw unrounded floats**, then rounds each of the four sums **exactly once at the end**. Rounding per line would break parity — this is load-bearing. |
| `mealMacroTotalsToMealColumns(totals)` | `String()`s each number (PG `numeric` takes string literals; Drizzle maps unconstrained `numeric` to `string`). |
| `mealTotalsLinesFromDbRows(rows)` | Adapts join rows; `null`/`''`/non-finite → `0`; **null `unit` defaults to `'100g'`**. |

**Call sites** (currently `apps/web/src/lib/services/meals.ts`, moving to the
server app): `recomputeMealTotals(tx, mealId)` must run **inside the same
transaction** as any `meal_item` mutation. `meal.total_*` silently drifts if any
write path skips it.

**Near-duplicates that must not be confused with it:**

- `lib/helpers/nutrition-numbers.ts` — same rounding formula, used to shape API
  JSON out of `numeric` strings.
- `lib/helpers/macros.ts` — its own identical `getMacroFactor`, plus
  `toEquivalentGrams(quantity, unit, gramsPerUnit)` (falls back to `100` when
  `grams_per_unit` is null). Its `calculateMacrosForMealItemWithUnit` rounds
  with **`roundUpToTenth` = `Math.ceil(v * 10) / 10`** — a *different* rule, for
  per-item display only, never for persisted totals.

---

## 5. Seeding

`packages/db/src/seed.ts` resets only
`{ foodCategory, foodItemCategory, foodItem, meal, mealItem, dietPlan, dietPlanMeal }`
— auth tables, assignments, consumptions, overrides, body composition and audit
log are untouched. It reads a USDA FoodData Central Foundation Foods JSON.

> **Known defect to fix during the overhaul:** the source path is hardcoded to a
> developer machine (`/Users/nadersafa/Downloads/...`) and will fail anywhere
> else. It should come from an env var or CLI argument. The reset list also
> includes `meal`/`mealItem`/`dietPlan`/`dietPlanMeal` which the script never
> re-seeds, leaving those four tables empty after a seed.

Macro back-fill chain when a macro is missing and `USDA_API_KEY` is set:
abridged `/food/{fdcId}` lookup (memoized), then `/foods/search` preferring
non-`Branded` results (memoized). 10 s timeout, 3 attempts, honors `Retry-After`
on 429. Anything still missing is written as `'0'`.

---

## 6. Migration history — traps

| # | Migration | What | Why it matters |
| --- | --- | --- | --- |
| T1 | `0022` | Data backfill setting null macros to `'0'` before `NOT NULL` | Invisible in schema files |
| T2 | `0023` | Hand-written and deliberately idempotent (`IF EXISTS` / `IF NOT EXISTS` throughout) | **Production DBs may be in divergent states.** Introspect the real DB before trusting the snapshot. |
| T3 | `0023` | Drops `effective_date`, adds `effective_dates jsonb` with **no backfill** | Pre-0023 overrides lost date scoping |
| T4 | `0021` | Drops `food_item.category_id`, `fdc_id`, `serving_size`; creates the join table with **no backfill** | Pre-0021 category assignments were lost; USDA linkage gone from the DB |
| T5 | `0012` | Hand-written (non-drizzle filename, hand-picked `when`) | Authored outside drizzle-kit |
| T6 | `0017`, `0018` | `ALTER TYPE ... ADD VALUE` | Cannot run inside a transaction on older PG |
| T7 | `0016`, `0020` | FK behavior changes via DROP + ADD CONSTRAINT | Three FKs depend on `onUpdate: Restrict`; easy to drop accidentally |
| T8 | various | Four CHECK constraints | Must survive any schema tooling change |
| T9 | `0005`, `0007`, `0021` | Column drops that erase history (done as drop+add, not `RENAME`) | `diet_plan.start_date`/`end_date`; `image_url` → `image_public_id` |

**Verified absent:** no triggers, no functions, no generated/`STORED` columns,
no partial indexes, no non-btree indexes, no views, no `NULLS NOT DISTINCT`,
no RLS, no non-`public` schemas, no `SEQUENCE`/`SERIAL`/`IDENTITY`.

---

## 7. Type-handling notes for application code

- Bare `numeric` (no precision) on `food_item.*`, `meal.total_*`,
  `meal_item.quantity`, both override/consumption `quantity` columns, and
  `food_item.grams_per_unit`. Drizzle surfaces these as **`string`**.
- `timestamp` everywhere is **without time zone**.
- `date` columns are read by Drizzle as **`string` (`'YYYY-MM-DD'`)**:
  `user.dob`, `diet_plan_assignment.start_date`/`end_date`,
  `diet_plan_meal_consumption.consumed_date`,
  `diet_plan_meal_item_override.intent_start_date`,
  `diet_plan_meal_time_override.effective_date`.
- `effective_dates` is typed `string[]` via `$type<>()`.
- IDs use `$defaultFn(() => crypto.randomUUID())` — **application-side**, the
  columns are plain `text` with no DB `DEFAULT`.
- `$onUpdate(() => new Date())` on `updated_at` is likewise application-side.
