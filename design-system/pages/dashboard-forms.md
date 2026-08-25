# Dashboard forms — create / edit surfaces

> Overrides `MASTER.md` for the dashboard's create and edit forms.
> Everything not stated here follows MASTER.

## Forms covered

Field lists are from `docs/migration/api-surface.md` §4–6.

| Form | Route / surface | Width | Shape |
| --- | --- | --- | --- |
| Food category | `/dashboard/admin/categories` (+ `/[id]`) | `narrow` | `name` ≤100, `description?` ≤2000 |
| Food item | `/dashboard/admin/food-items` (+ `/[id]`) | `mediumWide` | **multipart** — `name`, `categoryIds[]` (1–20, required), macros (≥0, default 0), `unit` (default `100g`), `gramsPerUnit` (**required when `unit ≠ 100g`**), `file?`, `clearImage?` |
| Meal | `/dashboard/admin/meals` (+ `/[id]`) | `mediumWide` | `name` ≤255, `description?` ≤500, `mealItems[]` `{ foodItemId, quantity > 0 }` |
| Diet plan | `/dashboard/admin/diet-plans` (+ `/[id]`) | `full` | `name`, `description?`, `dietPlanMeals[]` `{ mealId, dayNumber ≥ 0, mealType ≤50, mealOrder ≥ 1, scheduledTime? HH:mm }` |
| Diet-plan assignment | `/dashboard/nutritionist/diet-plans` | `mediumWide` | `memberId`, `dietPlanId`, `startDate`, `endDate`, `mealTimeOverrides?` |
| Body-composition assessment | `/dashboard/direct-admin/members/[memberId]` | `mediumWide` | **multipart** — `memberId`, `assessedAt`, `heightCm`, `bodyFatPercent`, `weightKg`, `bmi`, `muscleMassKg`, `visceralFatAreaCm2`, `bodyWaterL`, `file?` |
| Organization / invite | `/dashboard/organizations` | `narrow` | Create org, invite member |
| Complete profile | `/complete-profile` | `narrow` | `dob` required before the dashboard unlocks |

## Surface choice

| Situation | Surface |
| --- | --- |
| Create, ≤ 5 fields | `Dialog` from the list page |
| Create, > 5 fields or with a file upload | Dedicated route, `ShellPage` |
| Edit | Dedicated `/[id]` route — **never** a dialog. Deep links must work |
| Sub-record edit within a parent (a meal item, a plan slot) | `Sheet side="right"` (`side="bottom"` below `md`) |

## Layout

- `ShellPage` width per the table above. Default is `narrow` (`max-w-xl`).
- **`FieldSet` + `FieldGroup` are the layout**, not ad-hoc `div`s.
  `FieldGroup` gives 24px between fields; `FieldSet` gives a real `<fieldset>` +
  `<legend>` per section.
- **One `Card` per logical section.** Fields go in `CardContent`; the section title is
  `FieldLegend` (default `variant="legend"`, `text-lg`) or `CardTitle`, not both.
- `mediumWide` two-column layouts use `Field orientation="responsive"` — it reflows on
  the **form's own width** via the `@md/field-group` container query, so it behaves
  correctly inside a sheet as well as a page.
- Below `md` every form is single-column, full width. No side-by-side fields.

## Controls

| Field kind | Component | Notes |
| --- | --- | --- |
| Short text | `Input` | Default `size` (44px) |
| Long text | `Textarea` | `shape: "block"` (`rounded-lg`), `field-sizing-content`, `min-h-28` |
| Single choice, ≤ 8 options | `Select` | |
| Single choice, > 8 or searchable | `Combobox` | |
| Multi-choice (`categoryIds[]`) | `Combobox` multiple → chips | 1–20, deduped |
| Boolean | `Checkbox` | 20px box, 44px hit area already built in |
| Number (macros, measurements) | `Input type="number"` with `inputMode="decimal"` | `text-right tabular-nums`; unit as a trailing `text-muted-foreground text-xs` |
| Date | `Input type="date"` | `dob` must be in the past; `startDate ≤ endDate` |
| Time | `Input type="time"` | `HH:mm`, matching `scheduledTime` |
| Image | `Input type="file"` | See below |

## Validation and errors

The split from `docs/migration/frontend.md` → *Forms* is binding:

- **Field errors → `FormFieldError`** (`role="alert"`, `text-destructive text-sm`),
  rendered by `FormField` directly under the control.
- **Server errors → a separate banner** at the top of the form. Never a field error,
  never only a toast.
- `FormField` clones its child to inject `aria-invalid` — do not set `aria-invalid` by
  hand and do not bypass `FormField` for the control it wraps.
- `mode: "onBlur"` on every `useForm`.
- Conditional requirements get a live hint, not just a submit-time error:
  `gramsPerUnit` becomes required the moment `unit ≠ 100g` — reveal and mark it then.
- Zod validation errors arrive as `details.fieldErrors` from `flattenError()`. Map them
  onto the matching fields; anything unmapped goes to the banner.
- **409 conflicts are banner errors** with a specific message: `OVERLAP` on an assignment
  date range, a meal or plan blocked by an existing assignment, a duplicate consumption.

## Actions

- `SubmitButton` (`@brnit/ui/components/submit-button`) is **the only** submit control.
  It disables itself and shows a spinner while in flight. No bare `<Button type="submit">`.
- Cancel is `Button variant="outline"` and only exists on dialogs and sheets — a
  full-page form navigates back via the breadcrumb.
- Actions live in `CardFooter` (page forms) or `DialogFooter` / `SheetFooter`.
  **Never a floating action bar.**
- Below `md` the footer buttons go full width, stacked, primary on top.
- Delete lives on the **detail** page, visually separated at the bottom, and always goes
  through `AlertDialog`.

## File upload (food items, assessments, avatars)

- Max **5 MB**; `jpeg`, `png`, `webp`, `gif`.
- Preview is `Avatar size="lg"` with `rounded-md`, or a `rounded-lg` thumbnail for
  larger imagery.
- An existing image gets a **Remove** `Button variant="ghost" size="sm"` that sets
  `clearImage` — it does not silently clear on re-pick.
- Show the size/type limits **before** the picker, not only in the error.
- Client-side validation must reject over-size files before the request; the server
  validates category ids before it uploads, so a bad `categoryIds[]` fails without
  burning a Cloudinary upload.

## Diet-plan builder (`full` width)

The one form that leaves the `narrow`/`mediumWide` pattern.

- `ShellPage` width `full`; disable the default section spacing and use an explicit flex
  column with `gap-4`.
- Slots are grouped by `dayNumber`, then ordered by `mealOrder`.
- One `Card size="sm"` per slot: meal name, `mealType`, optional `scheduledTime`.
- Below `md` days become a vertical stack; at `lg+` they may sit in columns.
- The plan is locked once it has **any** assignment — the API returns 409 on PATCH and
  DELETE. Render it read-only with an explanatory banner **before** the user edits, not
  after they submit.

## Anti-patterns for this page type

- Edit in a dialog
- Ad-hoc `div` wrappers instead of `FieldGroup` / `FieldSet`
- Adding `role="group"` to a single `Field` (see MASTER §8)
- A bare `<Button type="submit">` instead of `SubmitButton`
- Server errors in `FormFieldError`, or field errors in the banner
- Toast-only error reporting on a failed save
- Side-by-side fields below `md`
- Floating/sticky action bars on web forms
- Silently dropping an existing image on re-pick instead of an explicit `clearImage`
