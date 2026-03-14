# Meal Item Details Sheet

## Owner

The **Home screen** owns the meal item details bottom sheet. It holds the sheet ref and all related UI state (selected item, show alternatives). No global store is used for this flow.

## Open flow

1. User taps a meal item on the home screen.
2. `handleMealItemPress` runs: it sets `selectedMealItemForDetails` to `{ item, meal }` and calls `detailsSheetRef.current?.snapToIndex(0)`.
3. The sheet opens at the first snap point. Content is driven by `selectedMealItemForDetails` (and `showAlternatives` when the user taps "Show alternatives").

One user action → set state + snap ref. No `useEffect` involved.

## Close flow

1. User dismisses the sheet (e.g. pan down or backdrop) or taps "Use" on an alternative.
2. `handleCloseMealDetails` runs: it calls `detailsSheetRef.current?.snapToIndex(-1)`, then `setShowAlternatives(false)` and `setSelectedMealItemForDetails(null)`.

Sheet closes and local state is cleared.

## Alternatives

- "Show alternatives" sets `showAlternatives` to `true` and expands the sheet via `detailsSheetRef.current?.snapToIndex(1)`.
- Alternatives are loaded with `useMealItemAlternatives`; `assignmentId` and `dateStr` come from Home’s react-query and selected date. No store is involved.
- Tapping "Use" on an alternative runs the set-override mutation and then `handleCloseMealDetails`.

## Data source

All data for the sheet comes from the Home screen:

- **Selected item:** `selectedMealItemForDetails` (local state).
- **Assignment and date:** `assignmentId` from `useCurrentDietPlan`, `dateStr` from `selectedDate`. Not read from any global store.

## Diagram

```
Meal item press → setSelectedMealItemForDetails + snapToIndex(0) → sheet opens
Close / Use     → snapToIndex(-1) + clear state                    → sheet closes
```
