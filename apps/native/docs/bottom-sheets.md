# Bottom sheets

All bottom sheets in the app use the shared **AppBottomSheet** wrapper so behavior and styling stay consistent.

## Adding a new sheet

1. **Use `AppBottomSheet`** from `@/components/bottom-sheet`. Do not use `@gorhom/bottom-sheet` directly for the root sheet.
2. **Ref**: Use `AppBottomSheetRef` for open/close:
  - `ref.current.open()` — open at first snap point (default).
  - `ref.current.open(snapIndex)` — open at a specific snap index (e.g. `open(1)` for 60%).
  - `ref.current.close()` — close the sheet and run `onClose` if provided.
3. **Props**:
  - **headerTitle** — Simple title only (same padding and text style as all sheets).
  - **renderHeader** — Custom header (e.g. back button + title). Overrides `headerTitle` when set.
  - **footerComponent** — Optional. Use **SheetFooter** from `@/components/bottom-sheet` so the footer has consistent padding, border, and safe area. Pass your buttons/content as children; layout (row/column) is up to you.
  - **onClose** — Called when the sheet is closed (gesture or programmatic).
  - **snapPoints** — Optional. Default is `DEFAULT_SNAP_POINTS` (`['50%', '60%', '70%', '80%']`). Override for dynamic sizing if needed.
  - **keyboardShouldPersistTaps** — Set to `true` for forms so the keyboard doesn’t dismiss on tap.
4. **Children**: Your sheet body. It is rendered inside `BottomSheetScrollView` with shared content padding (horizontal and bottom).
5. **Controlled sheets**: If the sheet is driven by data (e.g. “open when item is selected”), keep an internal ref to `AppBottomSheet` and call `open(n)` / `close()` in an effect based on that data. Pass `onClose` so the parent can clear the selection when the sheet closes.

## Existing sheets

- **AssessmentDetailSheet** — Stats tab; controlled by selected assessment; shows full InBody metrics (date, org, weight, height, BMI, body fat %, muscle mass, visceral fat area, body water, optional image); opens at snap index 1.
- **EditProfileSheet** — Profile tab; custom ref type (same as `AppBottomSheetRef`); header + footer with Cancel/Save.
- **FoodAlternativesSheet** — Search tab; controlled by `foodItem`; custom header (back + title), conditional footer; opens at snap index 1.
- **SearchFilterSheet** — Search tab; ref for open/close; header “Filters”, footer Reset/Apply.

## Shared pieces

- **DEFAULT_SNAP_POINTS** — `['50%', '60%', '70%', '80%']`.
- **SheetBackdrop** — Used inside the wrapper; no need to use it in individual sheets.
- **SheetFooter** — Use in your `footerComponent` for consistent footer container styling.

