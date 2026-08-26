# Native Home tab

> Overrides `MASTER.md` for `apps/native/app/(tabs)/index.tsx` — the member's daily
> diet-plan screen. Everything not stated here follows MASTER.
>
> **Native takes colour from `@brnit/brand/tokens` (`brandColors`), not CSS.** Geometry
> comes from `apps/native/theme/{radii,spacing,typography,shadows}.ts`. There is no
> Tailwind here — the MASTER class names are the *web* expression of the same tokens.

## Intent

This is the screen `design.json` was drawn for. `composition.hierarchy`, in order:

1. Large greeting / screen title
2. Primary feature card
3. Secondary metrics / lists
4. Persistent bottom navigation

One glance answers *"what do I eat next, and am I on track today?"*.
Comfortable density — **fewer items per screen with clear grouping**.

## Composition

From `docs/migration/api-surface.md` §10 → *Native screens* → Home. Top to bottom:

| Band | Component | Notes |
| --- | --- | --- |
| Greeting header | `components/home-header.tsx` | Avatar (40px) + greeting stack left, circular icon button right — `design.json` `TopHeader` |
| Calendar strip | `components/calendar-strip.tsx`, `calendar-week-row.tsx`, `day-pill.tsx` | Horizontal day pills; **fling gestures change the day** |
| Progress card | `components/home-progress-card.tsx`, `calorie-ring.tsx`, `macro-bar.tsx`, `streak-badge.tsx` | The **feature card**: calorie ring + macro bars + streak badge |
| Meals | `components/home-meals-section.tsx`, `meal-card.tsx`, `meal-item-row.tsx` | One card per plan slot, ordered by `mealOrder` within the day |
| Detail | `components/meal-item-detail-sheet/`, `food-alternatives-sheet/` | Bottom sheets |
| Bottom nav | `components/bottom-nav.tsx` | Floating pill; the Expo Router tab bar is hidden in favour of it |

Data: `GET /api/member/me/current-diet-plan?from&to` (defaults `from = today UTC`,
`to = from + 6d`, range 1–31 days) plus `GET /api/member/me/consumption-streak`.

## Colour

| Element | Role token | Never |
| --- | --- | --- |
| Screen canvas | `appBg` | — |
| Cards, sheets, floating controls | `card` + a theme shadow | a border |
| Calorie-ring fill, macro-bar fill, selected day pill, active nav pill | `accent` | as text |
| Any accent-coloured label or icon | `accentFg` | `accent` |
| Copy on the active nav pill / any accent fill | `onAccent` | `#FFFFFF` — 2.83:1 |
| Copy and icons on the nav pill | `chromeFg` / `chromeMuted` | `ink` / `muted` |
| Ring track, macro-bar track | `border` or `surfaceAlt` | — |
| Corner blob, empty-state art | `decorative` | as an action or text colour |

`design.json` says the active nav pill label is white. **The shipped token is
`onAccent` (near-black).** See MASTER §10 deviation #1 — this is exactly the surface it
was decided on.

> `apps/native/theme/colors.ts` currently carries its own hardcoded copy of the palette
> with `ink: '#111111'`, while `@brnit/brand` ships `ink: '#010409'`. Re-point
> `theme/colors.ts` at `brandColors` during the port; do not fork the values.
> Native semantics `success` / `warning` / `danger` / `info` legitimately live in
> `theme/colors.ts` — they have **no** brand token (MASTER §10 deviation #4).

## Geometry

| Element | Value | Source |
| --- | --- | --- |
| Screen horizontal padding | `spacing[4]` = 16 | `design.json` `AppShell.defaultHorizontalPaddingPx` |
| Between sections | `spacing[6]` = 24 | `sectionGaps.betweenSectionsPx` |
| Between cards | `spacing[4]` = 16 | `sectionGaps.betweenCardsPx` |
| Between list rows | `spacing[3]` = 12 | `sectionGaps.betweenListItemsPx` |
| Meal card radius | `radii.lg` = 20 | `Card.base.radiusPx` |
| Progress (feature) card radius | `radii.xl` = 24 | `Card.variants.feature.radiusPx` |
| Bottom sheet radius | `radii['2xl']` = 28, top corners only | `design.json` `shape.radius.xl`. Web's bottom sheet is `rounded-t-3xl` (32) — native's ladder stops at 28, so they differ by design |
| Day pill | 34 × 34, `radii.pill` | `CalendarPillStrip.pill` |
| Bottom nav container | height 60, `radii.pill`, padding 8 | `BottomNavigation.container` |
| Active nav pill | height 40, `radii.pill`, paddingX 14, gap 8 | `BottomNavigation.item.activePill` |
| Macro bar | height 8, `radii.pill` | `ProgressBarRow.bar` |
| Minimum touch target | 44 | `accessibility.minimumTouchTargetPx` |

Use `borderCurve: "continuous"` on every rounded surface for iOS squircles.
Elevation via `useShadows()` (`apps/native/theme/shadows.ts`) — light shadows are tinted,
dark shadows are stronger and opaque, because a tinted shadow vanishes on charcoal.

## Safe areas

- Header uses `insets.top + spacing[3]`.
- The floating bottom nav sits above the home indicator with extra padding
  (`design.json` `layout.safeAreas.bottom`).
- The meal list needs bottom content padding equal to **nav height + inset + `spacing[4]`**
  so the last meal card is not trapped under the nav.
- **Never** combine a manual top inset with `contentInsetAdjustmentBehavior="automatic"` —
  it double-counts and leaves a dead gap at the top.

## Interaction

- Day change: fling left/right on the calendar strip **and** tap a day pill. Both must work.
- Press feedback: `scale(0.98)` + `opacity 0.95`, 120–180ms, `ease-standard`.
- Marking a meal consumed is **optimistic** — flip the card state immediately, then
  reconcile. `409 DUPLICATE` means it was already marked: keep the marked state, do not
  show an error.
- Unmark posts a delete by slot (`dietPlanAssignmentId` + `dietPlanMealId` +
  `consumedDate`). Give it a confirm only if the meal has custom `consumedItems`.
- Item detail and food alternatives open as **bottom sheets**, never a full-screen push.
- Alternatives require a `quantity` (> 0, ≤ 10000) — resolve the *displayed* quantity for
  that slot on that date (override-aware) before opening the sheet.

## States

| State | Treatment |
| --- | --- |
| Loading | Skeletons matching the final layout — one ring block, one macro block, three meal cards |
| Skeleton motion | **Must respect `AccessibilityInfo.isReduceMotionEnabled()`** and subscribe to `reduceMotionChanged`, freezing at full opacity |
| Fast responses | `useSkeletonLoading` minimum-hold so a fast response does not flicker |
| No plan assigned | `EmptyState` compound (`Root` / `Icon` / `Title` / `Body` / `Action`) with `decorative` art. Copy explains a nutritionist assigns the plan — do **not** offer a create action the member cannot perform |
| Rest day / no meals for the selected day | `inset` empty state inside the meals section; header, calendar strip and progress card stay |
| Offline | Banner above content; keep the last-loaded day rendered |

## Anti-patterns for this screen

- White text on the active nav pill or any accent fill
- `accent` as a text or icon colour
- `ink` / `muted` on the nav pill
- Pure `#FFFFFF` chrome copy instead of `chromeFg` (`#FAF7F4`)
- Borders on cards — elevation and whitespace only
- Square or small-radius surfaces (`radii.lg` = 20 is the floor for a card)
- More than one accent element competing in a band
- Purple used for anything interactive
- A tall pinned header that leaves a sliver for the meal list
- Manual top inset **and** `contentInsetAdjustmentBehavior="automatic"` together
- Meal cards clipped under the floating nav
- Animated skeletons that ignore Reduce Motion
- Emoji as icons
