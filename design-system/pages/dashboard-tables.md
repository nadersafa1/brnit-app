# Dashboard tables — admin / nutritionist / direct-admin CRUD lists

> Overrides `MASTER.md` for the web dashboard's paginated list pages.
> Everything not stated here follows MASTER.

## Pages covered

Screen inventory from `docs/migration/api-surface.md` §10 → *Web screens*.

| Route | Entity | Sort keys | Notes |
| --- | --- | --- | --- |
| `/dashboard/admin` | Users | — | better-auth admin plugin: role change, ban, remove, impersonate |
| `/dashboard/admin/categories` | Food categories | `name`, `createdAt` (default `name`) | Search matches name **or** description |
| `/dashboard/admin/food-items` | Food items | `name`, `calories`, `protein`, `carbs`, `fat`, `createdAt` (default `createdAt`) | `categoryId` filter; image column |
| `/dashboard/admin/meals` | Meals | `name`, `createdAt` | Totals rounded to 2dp; clone action |
| `/dashboard/admin/diet-plans` | Diet plans | — | `slotCount` per row |
| `/dashboard/nutritionist/categories` | Food categories | as admin | **Read-only** |
| `/dashboard/nutritionist/food-items` | Food items | as admin | **Read-only** |
| `/dashboard/nutritionist/meals` | Meals | as admin | Full CRUD |
| `/dashboard/nutritionist/diet-plans` | Diet plans | — | Full CRUD + assignments |
| `/dashboard/direct-admin/members` | Members | — | Body-composition assessments |
| `/dashboard/organizations` | Organizations | — | Create, invite |
| `/dashboard/organizations/[id]/members` | Org members | — | Role, remove |

## Layout

- **`ShellPage` width:** `wide` (`mx-auto max-w-6xl`).
- **Structure:** `ShellPageHeader` (title + create action in `actions`) → toolbar → one
  `Card` wrapping the `Table` → pagination footer.
- **One create action per page**, in the header `actions` slot, `Button variant="default"`.
  Never a floating FAB, never a second primary button in the toolbar.

## Toolbar

| Control | Component | Rules |
| --- | --- | --- |
| Search | `Input` (`size="sm"`, `@brnit/ui/components/input`) | Debounced. `q` is trimmed, ≤100 chars. **`aria-label` required** — the placeholder is not a label. |
| Sort | `Select` (`size="sm"`) | Only the sort keys in the table above. **`aria-label` required.** |
| Entity filters | `Select` / `Combobox` | e.g. `categoryId` on food items |
| Page size | `Select` (`size="sm"`) | `[10, 25, 50, 100]` — the sizes the API offers |

- **Below `md` the toolbar moves into a `Sheet`** behind a single filter `Button`
  (`variant="outline"`, `size="sm"`) with an active-count `Badge variant="accent"`.
  Do not stack four full-width selects on a phone.
- At `md+` the toolbar is one `flex flex-wrap items-center gap-3` row above the table.

## Table

- Use `Table` from `@brnit/ui/components/table` — never a hand-rolled `<table>`, never a
  grid of `div`s.
- The container already scrolls (`overflow-x-auto rounded-lg`) and every cell is
  `whitespace-nowrap`. **Do not add `whitespace-normal` to force wrapping** — horizontal
  scroll is how brnit shows a wide table on a phone.
- Wrap the table in `Card` with `CardContent` only — no `CardHeader` above it; the page
  header already names the page.
- Zebra striping is **off**. Row separation is the shipped `border-b` on `TableRow`.
- Row hover is `hover:bg-accent` (already on `TableRow`) — that is the wash, not the
  brand accent. Do not restyle it.

### Columns

| Column type | Rule |
| --- | --- |
| Primary name | `font-medium`; navigates to the detail route. Use a real link/button — not a row-level `onClick` on the `<tr>` |
| Sortable header | Header renders a `Button variant="ghost" size="xs"` with a `ChevronUp/Down` icon and `aria-sort` on the `<th>` |
| Thumbnail | `Avatar size="sm"` with `className="rounded-md"`; empty state is `AvatarFallback` + `ImageIcon`, `aria-hidden` |
| Numeric (macros, counts) | `text-right tabular-nums` |
| Status / role | `Badge` — `secondary` neutral, `accent` for the active/current state, `destructive` for banned. **Always with a text label, never colour-alone** |
| Row actions | Right-most column, `DropdownMenu` triggered by `Button variant="ghost" size="icon-xs"` with `<span className="sr-only">` naming the row |

`size="xs"` / `icon-xs` (32px) is the sanctioned desk-density exception here — see
MASTER §6.1. It applies to **row actions and sort headers only**.

### Destructive actions

- `AlertDialog` confirmation for every delete. Title names the entity; the confirm button
  is `Button variant="destructive"`.
- The API returns **409** for blocked deletes (food item referenced by a meal item /
  override / consumption; meal still holding items or referenced by a plan; plan with any
  assignment). Surface that as a **non-dismissing inline error inside the dialog**, not a
  toast that disappears before it is read. Say *what* blocks it.

## States

| State | Treatment |
| --- | --- |
| Loading (first page) | `Skeleton` rows inside the table body — same column count, same row height. Not a centred spinner. |
| Loading (page change / re-sort) | Keep the old rows, dim to `opacity-60`, disable the toolbar. Do **not** unmount into skeletons — the layout must not jump. |
| Empty (no records) | `EmptyState` inside the `Card`: icon in a ring, title, body, and the create action. `EmptyState` is **app-level** (`apps/web/src/components/**`), not a `@brnit/ui` export |
| Empty (filters exclude everything) | Different copy + a **Clear filters** `Button variant="outline"` |
| Error | `role="alert"` block inside the `Card` plus a **Retry** `Button variant="outline"` that invalidates the query |

## Pagination

Offset-based (`page`, `perPage`), rendered as a footer row under the table inside the
same `Card`:
`"{start}–{end} of {totalItems}"` on the left, Previous / Next
(`Button variant="outline" size="sm"`) on the right, page-size `Select` beside them.
Below `sm` the range text and the controls stack.

## Anti-patterns for this page type

- Card grids instead of a table on desktop — these are dense CRUD lists
- Two primary buttons in the header
- Row `onClick` without a focusable, keyboard-reachable control inside the row
- Icon-only row actions with no `sr-only` label
- Sortable headers without `aria-sort`
- Search or sort controls without `aria-label`
- Swallowing a 409 into a generic "Something went wrong" toast
- Skeleton-flash on re-sort or page change
