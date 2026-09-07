# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Brnit
**Category:** Nutrition / diet-plan app — mobile-first, **light-first**
**Aesthetic:** Pastel Soft UI — blush canvas, white floating cards, vivid orange accent, large radii, soft blurred shadows, no borders

## Sources of truth

| Layer | File | Authority |
| --- | --- | --- |
| **Colour tokens (web)** | `packages/brand/src/brand.css` | **Canonical.** Everything else defers to it. |
| Colour tokens (native / email) | `packages/brand/src/tokens.ts` | Same roles, same order, hand-kept in sync — no codegen |
| Radii, shadows, motion, type stack (web) | `packages/ui/src/styles/globals.css` (`@theme inline`) | Canonical for web geometry |
| Radii, spacing, type, shadows (native) | `apps/native/theme/{radii,spacing,typography,shadows}.ts` | Canonical for native geometry |
| Component behaviour | `packages/ui/src/components/**` | Canonical |
| Creative direction | `design.json` | **Intent only.** Where it disagrees with the shipped tokens, the code wins — see [Deviations](#deviations-from-designjson). |

`design.json` is the original spec. `packages/brand` is what actually shipped. This
document describes **what shipped**.

---

## 1. Colour

### 1.1 The three accessibility invariants

These are encoded in the token *names* so misuse is visible at the call site. They are
documented in the header of `packages/brand/src/brand.css` and per-token in
`packages/brand/src/tokens.ts`. Do not work around them.

| # | Rule | Why |
| --- | --- | --- |
| **1** | `--brand-accent` is a **FILL ONLY**. Never a text or icon colour. | 2.42:1 on `--brand-app`, 2.83:1 on `--brand-card` (light). Fails AA at every size. |
| **2** | `--brand-accent-fg` is the readable accent — the **only** accent colour for copy and icons on light/dark surfaces. | 5.11:1 on `--brand-app`, 5.97:1 on `--brand-card` (light); 9.01:1 / 8.04:1 (dark). |
| **3** | `--brand-on-accent` is the **only legal copy colour on an accent fill**. | 7.26:1 light, 7.90:1 dark. `design.json` asks for white here; white is 2.83:1 and was rejected. |

Plus a fourth rule the chrome tokens encode:

| # | Rule | Why |
| --- | --- | --- |
| **4** | `--brand-nav-pill` / `--brand-nav-pill-muted` are dark in **both** themes. Copy on them is `--brand-chrome-fg` / `--brand-chrome-muted`, never `--brand-ink` / `--brand-muted`. | `--brand-ink` is near-black in light mode and would be invisible on the nav pill. |

### 1.2 Palette — as shipped

Light is `:root`; dark overrides under `html.dark`. Native reads the same roles from
`brandColors.light` / `brandColors.dark` in `packages/brand/src/tokens.ts`.

Ratios below are the ones the brand package itself documents (WCAG 2.1 relative
luminance), stated `fg on bg`. Roles with no ratio quoted are surfaces or fills, not
copy colours.

| Role | CSS variable | Light | Dark | Documented contrast |
| --- | --- | --- | --- | --- |
| Accent **fill** | `--brand-accent` | `#FD6E20` | `#FF7A2E` | 2.42:1 on app (light) — **fill only** |
| Accent **copy** | `--brand-accent-fg` | `#AE3F0A` | `#FF9A5C` | 5.11 app / 5.97 card / 5.34 surfaceAlt · dark 9.01 / 8.04 |
| Accent light (gradients, tints) | `--brand-accent-light` | `#FF8F50` | `#FF9A5C` | not for copy |
| Accent wash | `--brand-accent-soft` | `rgba(253,110,32,.14)` | `rgba(255,122,46,.22)` | not for copy |
| On accent | `--brand-on-accent` | `#010409` | `#010409` | 7.26:1 light · 7.90:1 dark |
| Primary copy | `--brand-ink` | `#010409` | `#F4F2EF` | 17.55 app / 20.54 card · dark 16.88 / 15.07 |
| Secondary copy | `--brand-subtle` | `#3A3A3A` | `#CFC9C1` | 9.72:1 on app · dark 11.48:1 |
| Tertiary copy | `--brand-muted` | `#6B6B6B` | `#9A958F` | 4.55 app / 5.33 card / 4.76 surfaceAlt · dark 6.35 / 5.67 |
| Hairline / progress track | `--brand-border` | `#E8E8E8` | `#35312E` | never a text colour |
| Inset well | `--brand-surface-alt` | `#F2F2F2` | `#1B1A18` | surface |
| App canvas | `--brand-app` | `#FCE9E7` | `#121110` | surface |
| Card | `--brand-card` | `#FFFFFF` | `#1E1D1B` | surface |
| Quieter card | `--brand-card-alt` | `#F7F7F7` | `#252320` | surface |
| Card on colour/photo | `--brand-card-on-brand` | `rgba(1,4,9,.06)` | `rgba(255,255,255,.1)` | surface |
| Dark chrome | `--brand-nav-pill` | `#0B0B0B` | `#2C2926` | surface, dark in **both** themes |
| Dark chrome, inactive | `--brand-nav-pill-muted` | `#1A1A1A` | `#3A3733` | surface |
| Copy on chrome | `--brand-chrome-fg` | `#FAF7F4` | `#FAF7F4` | 18.44 on navPill · dark 13.55 / 11.09 |
| Inactive copy on chrome | `--brand-chrome-muted` | `#B8B2AC` | `#B8B2AC` | 9.37 / 8.29 · dark 6.89 / 5.64 |
| Chrome button hover | `--brand-chrome-hover` | `#1A1A1A` | `#3A3733` | solid, keeps `chrome-fg` readable |
| Segment inside chrome track | `--brand-chrome-overlay` | `rgba(255,255,255,.12)` | `rgba(255,255,255,.1)` | surface |
| Decorative lilac | `--brand-decorative` | `#C9BEFA` | `#B8A9F0` | 1.47:1 on app — **never copy, never an action colour**. `ink` on it is 11.96:1 (light) / 9.75:1 (dark). |
| Hover / press wash | `--brand-overlay-soft` | `rgba(1,4,9,.06)` | `rgba(255,255,255,.08)` | wash |
| Pressed / strong divider | `--brand-overlay-strong` | `rgba(1,4,9,.12)` | `rgba(255,255,255,.14)` | wash |
| Modal / sheet backdrop | `--brand-scrim` | `rgba(1,4,9,.35)` | `rgba(0,0,0,.6)` | backdrop |
| Elevation colour | `--brand-shadow` | `rgba(1,4,9,.12)` | `rgba(0,0,0,.55)` | shadow tint |
| Focus ring | `--brand-focus-ring` | `rgba(253,110,32,.4)` | `rgba(255,122,46,.45)` | 2px ring |

`brandCore` in `tokens.ts` holds the raw designer values (`accentOrange`, `pastelPurple`,
`blush`, `black`, `navBlack`, `charcoal`). **Never consume `brandCore` in a component** —
go through `brandColors` so the role and its contrast guarantee travel with the value.

### 1.3 Email palette

`brandEmail` in `packages/brand/src/tokens.ts` is a **flat, light-only** set — email
clients have no theme toggle and no CSS custom properties. Same invariants apply:
`accent` is a fill, `accentFg` (`#AE3F0A`, 5.60:1 on `wrapperBg`) is the link colour,
`onAccent` (7.26:1) is the only copy colour on the button.

### 1.4 The two class vocabularies

`packages/ui/src/styles/globals.css` ships the **stock shadcn neutral palette** as a
placeholder and documents the exact remap the consuming app must perform. That remap is
**not free-form** — the components rely on it:

| shadcn var | must map to | note |
| --- | --- | --- |
| `--background` | `--brand-app` | |
| `--foreground` | `--brand-ink` | |
| `--card` / `--card-foreground` | `--brand-card` / `--brand-ink` | |
| `--card-alt` | `--brand-card-alt` | |
| `--popover` / `--popover-foreground` | `--brand-card` / `--brand-ink` | |
| `--primary` | `--brand-accent` | **fill only** |
| `--primary-foreground` | `--brand-on-accent` | **never** `--brand-ink` — identical in light, invisible on orange in dark |
| `--accent-fg` | `--brand-accent-fg` | accent-coloured **copy** |
| `--accent-soft` | `--brand-accent-soft` | low-opacity accent wash |
| `--secondary` / `--secondary-foreground` | `--brand-surface-alt` / `--brand-subtle` | |
| `--muted` / `--muted-foreground` | `--brand-surface-alt` / `--brand-muted` | |
| `--accent` / `--accent-foreground` | `--brand-overlay-soft` / `--brand-ink` | **hover/press wash — NOT the brand accent** |
| `--chrome` / `--chrome-foreground` / `--chrome-muted` | `--brand-nav-pill` / `--brand-chrome-fg` / `--brand-chrome-muted` | |
| `--border` / `--input` | `--brand-border` | |
| `--ring` | `--brand-focus-ring` | |
| `--scrim` | `--brand-scrim` | |

> **Naming trap.** In shadcn's vocabulary `--accent` is the *hover wash*, not the brand
> accent. `bg-accent` = row hover. `bg-primary` = orange fill. `text-accent-fg` = readable
> orange copy. `bg-accent-soft` = orange wash. Read that table before writing any
> accent-coloured class.

`--destructive` has **no brand token**. `globals.css` defines it directly as a *readable*
red (`#c0202a` light / `#ff8a80` dark) so `text-destructive` is always safe.
`design.json`'s `semantic.danger` (`#FF4D4F`) is a status **fill** and fails AA as copy —
do not map it onto `--destructive`.

Net effect once the app remap lands: two parallel vocabularies that resolve to the same
values — `bg-card` / `text-muted-foreground` (shadcn semantics, used **inside**
`@brnit/ui`) and `bg-brand-card` / `text-brand-muted` (brand-explicit, used in app
chrome). Both are legal; do not mix them within one component.

> **Status:** `apps/web/src/index.css` is still the pre-overhaul stock shadcn file. The
> remap above is required wiring the web app must land, not shipped state. Until it does,
> `@brnit/ui` renders in neutral greys.

---

## 2. Typography

**Stack** (`--font-sans` in `packages/ui/src/styles/globals.css`):
`"General Sans", "General Sans Variable", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`

> ⚠️ **General Sans is declared but never loaded.** There is no `@font-face`, no font file
> and no CDN link anywhere in the repo, so it currently resolves to `system-ui`. Either
> self-host the family or accept the fallback — do not add per-component font overrides.

No type ramp was shipped in `@theme`, so **Tailwind v4 defaults apply**. The mapping from
`design.json`'s `typography.typeScale`:

| `design.json` role | Spec (px / lh / weight) | Tailwind class | Actual | Exact? |
| --- | --- | --- | --- | --- |
| `display` | 32 / 38 / 700 | `text-3xl font-bold tracking-tight` | 30 / 36 | ≈ |
| `h1` | 24 / 30 / 700 | `text-2xl font-bold tracking-tight` | 24 / 32 | size ✓, lh +2 |
| `h2` | 20 / 26 / 700 | `text-xl font-bold tracking-tight` | 20 / 28 | size ✓, lh +2 |
| `h3` | 18 / 24 / 600 | `text-lg font-semibold` | 18 / 28 | size ✓, lh +4 |
| `body` | 14 / 20 / 500 | `text-sm` | 14 / 20 | ✓ |
| `bodyMuted` | 13 / 18 / 500 | `text-xs text-muted-foreground` | 12 / 16 | ≈ |
| `caption` | 12 / 16 / 500 | `text-xs` | 12 / 16 | ✓ |

`body { text-sm }` is the global default (`packages/ui/src/styles/globals.css`,
`@layer base`). brnit runs a **comfortable** 14px baseline — do not port qpadel's
`text-xs` desk density.

### House sizes as shipped

| Element | Class | Source |
| --- | --- | --- |
| Card title | `font-semibold text-lg leading-tight tracking-tight` | `card.tsx` `CardTitle` |
| Card title, `size="feature"` | `text-xl` | `card.tsx` |
| Card title, `size="sm"` | `text-base` | `card.tsx` |
| Card description | `text-muted-foreground text-sm leading-relaxed` | `card.tsx` `CardDescription` |
| Fieldset legend | `text-lg font-semibold` (`variant="label"` → `text-sm`) | `field.tsx` `FieldLegend` |
| Table header cell | `text-xs tracking-wide font-medium text-muted-foreground` | `table.tsx` `TableHead` |
| Field / form error | `text-destructive text-sm` | `form-field-error.tsx`, `field.tsx` `FieldError` |

Sentence-case labels. All-caps only for micro-labels. Stat numbers get
`font-semibold tabular-nums`.

---

## 3. Spacing & grid

`globals.css` does **not** override Tailwind's `--spacing`, so the default `0.25rem`
(4px) step is in force — which is exactly `design.json`'s `globalSpacing.unitPx`.

| `design.json` | Value | Tailwind |
| --- | --- | --- |
| `grid.marginPx` / `gutterPx` | 16 | `p-4` / `gap-4` |
| `sectionGaps.betweenSectionsPx` | 24 | `space-y-6` |
| `sectionGaps.betweenCardsPx` | 16 | `gap-4` |
| `sectionGaps.betweenListItemsPx` | 12 | `gap-3` |
| `componentPadding.cardPaddingPx` | 16 | `p-4` (shipped `Card` uses `py-4` + `px-4`) |
| `componentPadding.pillPaddingX_Px` | 14 | `px-3.5` |
| `componentPadding.bottomNavPaddingPx` | 8 | `p-2` |

Native mirrors this in `apps/native/theme/spacing.ts` (`spacing[4] === 16`).

Mobile grid is **4 columns, 16px margins, 16px gutters**. Cards and list rows span the
full width inside those margins — do not build multi-column card grids below `md`.

---

## 4. Radii

`--radius: 1rem` (16px) with a derived ladder in `globals.css` `@theme inline`.
**brnit is the opposite of qpadel's `--radius: 0`.** Sharp corners are the exception.

| Tailwind class | Value | `design.json` name | Typical use |
| --- | --- | --- | --- |
| `rounded-xs` | 8px | `xs` | checkbox |
| `rounded-sm` | 12px | `sm` | small chips, inline tiles |
| `rounded-md` | 16px | `md` | icon tiles, settings rows, `Card size="sm"` |
| `rounded-lg` | 20px | `lg` | **default card**, table container, skeleton, accordion item, toast |
| `rounded-xl` | 24px | — | `Card size="feature"` / analytics (`design.json` `Card.variants.feature.radiusPx: 24`) |
| `rounded-2xl` | 28px | `xl` | dialogs |
| `rounded-3xl` | 32px | — | bottom sheets (`data-[side=bottom]:rounded-t-3xl`) |
| `rounded-4xl` | 40px | — | oversized hero surfaces |
| `rounded-full` | 999 | `pill` | buttons, badges, inputs, selects, avatars, tabs |

> `design.json`'s `xl` is **28px**, which lands on Tailwind's `rounded-2xl`, not
> `rounded-xl`. `apps/native/theme/radii.ts` uses the same shifted ladder
> (`xl: 24`, `'2xl': 28`). Quote the *class*, never the `design.json` name, in review.

**Borders are the exception.** `design.json` `shape.stroke.default: "none"`. Group with
elevation and whitespace. `--brand-border` is for hairline separators and progress-bar
tracks, not for outlining cards.

---

## 5. Elevation & motion

Two shadows, both tinted by `--brand-shadow` so the tint follows the theme (warm ink at
12% in light, opaque black in dark where a tinted shadow vanishes on charcoal).

| Tailwind class | Value | `design.json` |
| --- | --- | --- |
| `shadow-soft` | `0 6px 18px 0 var(--brand-shadow)` | `elevation.shadows.sm` |
| `shadow-float` | `0 10px 28px 0 var(--brand-shadow)` | `elevation.shadows.md` |

**Never use Tailwind's stock `shadow-sm` / `shadow-md` / `shadow-lg`** — they are neutral
black and break the warm tint.

Motion (`globals.css` `@theme inline`):

| Token | Value | `design.json` |
| --- | --- | --- |
| `--default-transition-duration` | `180ms` | `motion.timingMs.base` |
| `ease-standard` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | `motion.easing.standard` |
| `ease-emphasized` | `cubic-bezier(0.2, 0.9, 0.2, 1)` | `motion.easing.emphasized` |

A bare `transition` is therefore 180ms + `ease-standard` — you rarely need to specify
either. `design.json`'s `fast` (120ms) and `slow` (260ms) have **no token**; use
`duration-[120ms]` / `duration-[260ms]` explicitly if you truly need them.

Press feedback is `active:scale-[0.98]` (already on `Button`). No hover translate, no
hover scale.

---

## 6. Component inventory — `@brnit/ui`

### Import convention

**No barrel file.** Every import is a deep path. Knip and Ultracite forbid barrels.

```ts
import { Button } from "@brnit/ui/components/button";
import { cn } from "@brnit/ui/lib/utils";
import { useIsMobile } from "@brnit/ui/hooks/use-mobile";
```

Export map (`packages/ui/package.json`): `./globals.css`, `./lib/*` → `src/lib/*.ts`,
`./components/*` → `src/components/*.tsx`, `./hooks/*` → `src/hooks/*.ts`,
`./postcss.config`.

Base: Tailwind v4 + **`@base-ui/react`** + CVA. **Not Radix.** Base UI uses a `render`
prop for polymorphism, **not** `asChild`. Every root element carries
`data-slot="<name>"`.

### Shipped modules

| Module | Key exports | Notes |
| --- | --- | --- |
| `accordion` | `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent` | Items are **separated cards** (`rounded-lg bg-card shadow-soft`, `gap-3`), not a bordered stack |
| `alert-dialog` | 12 exports: + `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogMedia`, header/footer/title/description/overlay/portal/trigger/content | Base UI has no Action/Cancel parts — both render `AlertDialog.Close`, differing only in `Button` variant |
| `avatar` | `Avatar`, `AvatarImage`, `AvatarFallback`, `AvatarBadge`, `AvatarGroup`, `AvatarGroupCount` | `size`: `sm` 32 / `default` 40 / `lg` 48. 40px default is `design.json` `TopHeader.avatar.sizePx` |
| `badge` | `Badge`, `badgeVariants` | **This is brnit's `Chip`.** See §6.1 |
| `breadcrumb` | `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbPage`, `BreadcrumbSeparator`, `BreadcrumbEllipsis` | See §8 — locked a11y |
| `button` | `Button`, `buttonVariants` | See §6.1 |
| `card` | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter` | `size`: `default` / `sm` / `feature`. See §6.2 |
| `checkbox` | `Checkbox` | 20px box (`size-5 rounded-xs`) with an `after:-inset-x-3 after:-inset-y-3` hit area reaching the 44px minimum without changing the visual size |
| `collapsible` | `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` | Unstyled passthrough |
| `combobox` | `Combobox` + 15 parts (`ComboboxInput`, `ComboboxChips`, `ComboboxChip`, `ComboboxList`, `ComboboxItem`, `ComboboxEmpty`, `ComboboxStatus`, …) | Replaces cmdk + Radix Popover. Filtering, async lists, single **and** multiple selection with chips all come from the primitive |
| `dialog` | `Dialog` + 9 parts | `rounded-2xl` (28px), `shadow-float`, `sm:max-w-md`, `bg-scrim` backdrop with `supports-backdrop-filter:backdrop-blur-sm`. `showCloseButton` defaults `true` |
| `dropdown-menu` | 15 parts incl. `DropdownMenuCheckboxItem`, `DropdownMenuRadioGroup`, `DropdownMenuSub*`, `DropdownMenuShortcut` | Rows are 44px tall — thumb-friendly on mobile |
| `field` | `Field`, `FieldSet`, `FieldLegend`, `FieldGroup`, `FieldContent`, `FieldLabel`, `FieldTitle`, `FieldDescription`, `FieldSeparator`, `FieldError`, `fieldVariants` | **Layout set only.** See §6.3 and §8 |
| `form-field` | `FormField` | `Label` + control + `FormFieldError`; clones the child to inject `aria-invalid` when errored |
| `form-field-error` | `FormFieldError`, `FormFieldErrorLike` | The **only** sanctioned place a field-level error renders. `role="alert"` |
| `input` | `Input` | `fieldControlVariants`; `size`: `sm` / `default` / `lg` |
| `label` | `Label` | |
| `popover` | `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverHeader`, `PopoverTitle`, `PopoverDescription` | |
| `scroll-area` | `ScrollArea`, `ScrollBar` | |
| `select` | `Select` + 9 parts | Trigger uses `fieldControlVariants`; builds Base UI's `items` map internally so callers don't duplicate labels |
| `separator` | `Separator` | |
| `sheet` | `Sheet` + 8 parts | `side`: `top` / `right` / `bottom` / `left`. Bottom/top get `rounded-t-3xl` / `rounded-b-3xl` and `max-h-[90svh]`; left/right are `w-3/4 sm:max-w-md` |
| `sidebar` | 25 exports incl. `SidebarProvider`, `SidebarInset`, `SidebarMenuButton`, `SidebarMenuSkeleton`, `useSidebar`, `sidebarMenuButtonVariants` | Widths `17rem` / `19rem` mobile / `3.5rem` icon; state persisted in the `sidebar_state` cookie (7 days); keyboard shortcut **Ctrl/Cmd + B** |
| `skeleton` | `Skeleton` | `animate-pulse rounded-lg bg-muted` |
| `sonner` | `Toaster` | `next-themes`-aware, Lucide icons, `--border-radius: var(--radius-lg)`, `shadow-float` |
| `submit-button` | `SubmitButton` | The **only** sanctioned submit control. Spinner + self-disable while `isSubmitting` |
| `table` | `Table` + 7 parts | Container is `overflow-x-auto rounded-lg`. See §6.4 |
| `tabs` | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`, `tabsListVariants` | `variant`: `default` / `chrome` / `line`. See §6.5 |
| `textarea` | `Textarea` | `fieldControlVariants({ shape: "block" })` — keeps the height ladder, opts out of the pill radius. `min-h-28`, `field-sizing-content` |
| `tooltip` | `Tooltip`, `TooltipProvider`, `TooltipTrigger`, `TooltipContent` | |
| `hooks/use-mobile` | `useIsMobile` | `matchMedia` at **768px** (Tailwind `md`) — the point the shell switches to mobile |
| `lib/utils` | `cn` | `twMerge(clsx(inputs))` |
| `lib/field-control-variants` | `FIELD_CONTROL_BASE`, `fieldControlVariants` | See §6.3 |

> `src/components/select-item-label.ts` is package-internal (`getTextFromSelectItemChildren`).
> The export map resolves `./components/*` to `.tsx` only, so it is **not** importable
> from apps — do not reach for it.

Anything not in this table does not exist in `@brnit/ui`. Compose it from these
primitives in the app; do not add to `@brnit/ui` without a design review.

**Deliberately app-level, not in the package** (per `docs/migration/frontend.md`):
`AppSidebarShell` / `ShellTopBar` / `ShellPage` / `ShellPageHeader` / `ShellEmptyState` /
`ShellNavGroup`, `EmptyState`, `OfflineBanner`, `Loader`. They live in
`apps/web/src/components/**` and `apps/native/components/**`. Do not go looking for them
under `@brnit/ui/components/*`.

### 6.1 Buttons and chips

`Button` (`packages/ui/src/components/button.tsx`) — pill-shaped, thumb-friendly,
`active:scale-[0.98]`, `disabled:opacity-50`, `focus-visible:ring-2 focus-visible:ring-ring`.

| `variant` | Surface | Copy | Use for |
| --- | --- | --- | --- |
| `default` | `bg-primary` + `shadow-soft` | `text-primary-foreground` | The one primary action per view |
| `secondary` | `bg-card` + `shadow-soft` | `text-card-foreground` | `design.json` `SecondaryButton` — the floating white pill |
| `outline` | transparent + `border-border` | `text-foreground` | Low-emphasis, in dense toolbars |
| `ghost` | transparent | `text-foreground` | Icon buttons, table row actions |
| `chrome` | `bg-chrome` + `shadow-float` | `text-chrome-foreground` | Controls on the dark nav surface |
| `destructive` | `bg-destructive/10` | `text-destructive` | Delete / remove. **Not** a solid red fill |
| `link` | none | `text-accent-fg` | The only accent-**coloured** variant. `text-primary` would be 2.42:1 and is never used |

| `size` | Height | Notes |
| --- | --- | --- |
| `default` | `h-11` = **44px**, `px-4.5` = 18px | `design.json` `PrimaryButton.heightPx: 44` / `paddingX_Px: 18` |
| `lg` | `h-12` = 48px, `text-base` | Hero CTAs |
| `sm` | `h-9` = 36px | Toolbars |
| `xs` | `h-8` = 32px, `text-xs` | Table row actions only |
| `icon` | `size-11` = 44px | Default circular icon button |
| `icon-lg` / `icon-sm` / `icon-xs` | 48 / 40 / 32px | `icon-sm` (40px) is `design.json`'s `IconButton.sizePx` |

> `xs` / `icon-xs` (32px) and `sm` (36px) are **below** the 44px minimum touch target.
> They are a desk-density escape hatch for the web dashboard only. Never on native-shaped
> surfaces, never on a primary action.

`Badge` is `design.json`'s `Chip`: `rounded-full px-3.5 py-1.5 text-xs`. Variants
`default` (accent fill), `secondary`, `surface` (white + `shadow-soft`), `chrome` (the
spec's `Chip.states.selected` — near-black fill, chrome copy), `accent`
(`bg-accent-soft text-accent-fg`), `outline`, `destructive`, `ghost`, `link`.

> An accent **fill** with ink copy is deliberately **not offered** — it would be 2.42:1.
> Reach for `variant="accent"` (wash + `--accent-fg`) or `variant="default"` (fill +
> `--primary-foreground`).

### 6.2 Cards

`Card` is white on the blush canvas, **no border**, `shadow-soft`, `rounded-lg` (20px),
16px padding — `design.json` `components.Card.base` exactly.

| `size` | Radius | Padding | Gap | Shadow |
| --- | --- | --- | --- | --- |
| `sm` | `rounded-md` 16px | `py-3` / `px-3.5` | `gap-3` | `shadow-soft` |
| `default` | `rounded-lg` 20px | `py-4` / `px-4` | `gap-4` | `shadow-soft` |
| `feature` | `rounded-xl` 24px | `py-6` / `px-6` | `gap-5` | `shadow-float` |

`CardHeader` auto-arranges around `CardAction` (`has-data-[slot=card-action]:grid-cols-[1fr_auto]`).
A `<img>` as the first child gets `pt-0` so media can sit flush.

Use `size="feature"` for the one hero card per screen (`design.json`
`composition.hierarchy` → "Primary feature card"). Everything else is `default`.

### 6.3 Form controls

Every text-entry / value-picker control — `Input`, `Textarea`, `SelectTrigger`,
`ComboboxInput` — shares `fieldControlVariants`
(`packages/ui/src/lib/field-control-variants.ts`):

- **Filled, floating** — `bg-card` + `shadow-soft`. There is deliberately **no `border-*`**
  (`design.json` `shape.stroke.default: "none"`).
- `size`: `sm` `h-9` (36) / `default` `h-11` (**44**) / `lg` `h-12` (48).
- `shape`: `pill` (`rounded-full`, default) / `block` (`rounded-lg`, for `Textarea`).
- `focus-visible:ring-2 focus-visible:ring-ring` — the orange focus ring.
- `aria-invalid:ring-2 aria-invalid:ring-destructive/40` baked in.

Two layers, do not confuse them:

| Layer | Modules | Job |
| --- | --- | --- |
| **Layout** | `field.tsx` (`FieldSet`, `FieldGroup`, `Field`, `FieldLabel`, `FieldDescription`, `FieldSeparator`, `FieldError`) | Arranging labels, controls and help text |
| **Submit path** | `form-field.tsx`, `form-field-error.tsx`, `submit-button.tsx` | Carrying `aria-invalid` and `role="alert"`, blocking double-submit |

`FieldLabel` wrapping a whole `Field` becomes a **selectable card**: `bg-card`,
`shadow-soft`, `rounded-lg`, and on check `bg-accent-soft text-accent-fg` — a wash, never
an accent fill.

### 6.4 Tables

`Table` wraps itself in `relative w-full overflow-x-auto rounded-lg`. Header cells are
`h-12`, `text-xs tracking-wide`, `text-muted-foreground`. Body cells are `px-4 py-3.5`,
`whitespace-nowrap`. Rows get `hover:bg-accent`, `has-aria-expanded:bg-accent`,
`data-[state=selected]:bg-accent` — the hover wash, not the brand accent.

`whitespace-nowrap` on every cell means **the table scrolls horizontally rather than
wrapping**. That is intentional and is how brnit handles tables on a phone.

### 6.5 Tabs

| `variant` | Track | Active tab |
| --- | --- | --- |
| `default` | `bg-secondary text-muted-foreground`, pill, `h-12` | `bg-card text-card-foreground shadow-soft` |
| `chrome` | `bg-chrome text-chrome-muted shadow-float` | `bg-primary text-primary-foreground` |
| `line` | transparent, `gap-2`, no radius | `text-foreground` + 2px `bg-primary` underline |

`variant="chrome"` **is** `design.json`'s `BottomNavigation` recipe — a dark pill track
whose active item becomes an accent pill. Native's floating `BottomNav`
(`apps/native/components/bottom-nav.tsx`) is the same idea built with RN primitives.

---

## 7. Layout

### 7.1 The shell owns padding

`AppSidebarShell` applies `p-4 md:p-6` to its `<main>`. **Pages never repeat it.**
`ShellPage` applies a width class plus `space-y-6`. `ShellPageHeader` renders
eyebrow / title / description / actions and is the **only `<h1>` on the page**.

(Spec: `docs/migration/frontend.md` → *Shell*. The shell components live in
`apps/web/src/components/shell/` and are the web app's to build; the rules below are
binding on that implementation.)

### 7.2 Page width variants

| Variant | Class | Use for |
| --- | --- | --- |
| `narrow` | `mx-auto max-w-xl` | Single-column forms: profile, complete-profile, category create/edit |
| `medium` | `mx-auto max-w-3xl` | Dashboard overview, organization detail |
| `mediumWide` | `mx-auto max-w-4xl` | Two-column forms: food-item and assessment editors |
| `wide` | `mx-auto max-w-6xl` | All CRUD tables and member lists |
| `full` | `w-full max-w-none` | Diet-plan slot builder (day × meal grid) |

Auth screens live outside the shell entirely — see `pages/auth.md`.

### 7.3 Vertical rhythm

| Level | Gap | Class |
| --- | --- | --- |
| Between page sections | 24px | `space-y-6` (the `ShellPage` default) |
| Between cards in a group | 16px | `gap-4` |
| Between list rows | 12px | `gap-3` |
| Inside a card | 16px | `Card` default `gap-4` |

When a page needs a flex column instead (full-height grids), disable the default section
spacing and use explicit `gap-*` — never both.

---

## 8. Locked accessibility decisions

These two are already implemented and were argued once. **Do not revert them.**

| Decision | Where | Why |
| --- | --- | --- |
| The current breadcrumb page is **plain text** with `aria-current="page"` and **no `role="link"`** | `packages/ui/src/components/breadcrumb.tsx` → `BreadcrumbPage` | The current page is the destination, not a link. `role="link"` on a non-focusable `<span>` announces an interactive control that cannot be reached or activated. `aria-current="page"` alone is the WAI-ARIA breadcrumb pattern. |
| A single `Field` carries **no `role="group"`** | `packages/ui/src/components/field.tsx` → `Field` | A `Field` is one label-and-control pair, not a group; announcing it as one adds a redundant boundary around every input. **Grouping is `FieldSet`'s job** — it renders a real `<fieldset>` with a `<legend>`. |

### Checklist for every screen

From `docs/migration/frontend.md` → *Accessibility checklist*:

- Skip link in the shell targeting `#<mainId>`.
- Every icon-only control has `<span className="sr-only">` and/or `aria-label`;
  decorative icons get `aria-hidden`.
- `<nav aria-label>`, `<header>`, `<main id>`, **exactly one `<h1>` per page**.
- Segmented controls are real `<fieldset>` + `<legend className="sr-only">`.
- Focus rings standardised and always visible (`focus-visible:ring-2 focus-visible:ring-ring`).
- `aria-invalid` propagated by `FormField`; error text carries `role="alert"`.
- Search inputs and sort selects always take an `aria-label`.
- Minimum touch target **44px** (`design.json` `accessibility.minimumTouchTargetPx`).
- Never rely on colour alone — pair status colour with a label or icon.

---

## 9. Responsive — mobile-first

`design.json` lists `mobile-first` first in `meta.platforms` and specifies a 4-column
mobile grid. **Design the 375px view first, then add `md:` / `lg:` for the dashboard.**

| Breakpoint | Width | What changes |
| --- | --- | --- |
| base | < 640px | Single column. Full-width cards. Shell padding `p-4`. Sidebar is a `Sheet` (`19rem`). Tables scroll horizontally. Filters live in a sheet, not a toolbar row. |
| `sm` | ≥ 640px | Dialogs and side sheets cap at `max-w-md`. Header actions may sit beside the title. |
| `md` | ≥ 768px | **The shell switch** (`useIsMobile`, `packages/ui/src/hooks/use-mobile.ts`). Persistent sidebar (`17rem`). Shell padding `md:p-6`. Two-column form layouts become legal. |
| `lg` | ≥ 1024px | Multi-column card grids. Table toolbars inline. |
| `xl` | ≥ 1280px | Width caps (§7.2) start doing the work; do not widen past them. |

`Field orientation="responsive"` switches on a **container query**
(`@md/field-group`), not the viewport — it reflows on the form's own width. That is
correct; do not "fix" it to a media query.

### Test widths

**375** (small phone) · **390** (modern phone) · **768** (shell switch) · **1024** ·
**1440**.

---

## 10. Deviations from `design.json`

The shipped tokens win. These are the places they diverge, and why.

| # | `design.json` says | Shipped | Reason |
| --- | --- | --- | --- |
| 1 | `PrimaryButton.textColor: neutral.white`, `BottomNavigation…labelColor: neutral.white` | `--brand-on-accent: #010409` (near-black) | White on `#FD6E20` measures **2.83:1** and fails AA. Documented inline in `tokens.ts` and `brand.css`. |
| 2 | *(no such token)* | `--brand-accent-fg` `#AE3F0A` / `#FF9A5C` | The spec has no readable accent for copy. Without it every accent-coloured label fails contrast. |
| 3 | `semantic.danger: #FF4D4F` | `--destructive` `#c0202a` / `#ff8a80` | `#FF4D4F` is a status **fill** and fails AA as copy. `globals.css` refuses to map it. |
| 4 | `semantic.success / warning / info` | **Not in `@brnit/brand` at all** | Web has no success/warning/info token — only `--chart-1..5`. `brandEmail` carries `success`/`warning`/`danger` for email; native keeps its own in `apps/native/theme/colors.ts`. **Gap — see §11.** |
| 5 | Light-only spec (no dark section) | Complete `html.dark` scheme on warm charcoal `#121110` | brnit ships a theme toggle. All dark values are additions. |
| 6 | `neutral.ink: #111111` vs `neutral.black: #010409` | `ink` role → `#010409` (`brandCore.black`) | The brand picked the darker of the two. **`apps/native/theme/colors.ts` still has `ink: '#111111'`** — that file must be re-pointed at `@brnit/brand` during the native port. |
| 7 | `shape.radius.xl: 28` | `rounded-xl` is **24px**; 28px is `rounded-2xl` | The Tailwind ladder is derived from the 16px base and inserts a 24px step for feature cards. Native's `radii.ts` uses the same shifted names. |
| 8 | `Chip.paddingY_Px: 10` | `Badge` uses `py-1.5` (6px) | Tighter vertically so a badge fits inside a 44px table row and beside a 44px control. |
| 9 | `SearchField.paddingX_Px: 14` | `fieldControlVariants` default `px-4.5` (18px) | Aligned to the button padding so a search field and a button in the same row read as one system. |
| 10 | `elevation.shadows.sm` / `.md` | `shadow-soft` / `shadow-float` | Same geometry, renamed to remove the collision with Tailwind's stock `shadow-sm`/`shadow-md`. |
| 11 | `motion.timingMs.fast: 120`, `slow: 260` | Only `base` (180ms) is a token | `fast`/`slow` need arbitrary values. **Gap.** |
| 12 | `typography.fontFamily.primary: "General Sans"` | Declared in `--font-sans`, **never loaded** | No `@font-face`, no font file, no CDN link in the repo. Currently falls back to `system-ui`. **Gap.** |
| 13 | `typography.typeScale` (13px `bodyMuted`, 32px `display`, tight line-heights) | No `@theme` type ramp; Tailwind defaults | Only `body` (14/20) and `caption` (12/16) map exactly — see §2. |
| 14 | `color.tokens.brand.pastelPurple` | `decorative` role | Renamed to make "never an action colour, never a text colour" legible at the call site. |
| 15 | `neutral.gray700` / `gray500` | `subtle` / `muted` | Same values, role-named. |
| 16 | *(no such tokens)* | `accentLight`, `accentSoft`, `cardOnBrand`, `chromeHover`, `chromeOverlay`, `overlaySoft`, `overlayStrong`, `focusRing` | Additions the components needed. All documented per-token in `tokens.ts`. |

---

## 11. Where there is no guidance

`design.json` is a **mobile product spec**. It has no recipe for these shipped components,
so the calls below were made by the component library. Treat them as binding until a
designer overrides them here.

| Component | Call made | Rationale |
| --- | --- | --- |
| `Table` | Header `h-12` / `text-xs`, cell `py-3.5`, **horizontal scroll instead of wrap**, hover = `--accent` wash | `design.json` has no table. Comfortable density that still fits a phone, at the cost of horizontal scroll. |
| `Sidebar` | `17rem` / `19rem` mobile / `3.5rem` icon; cookie-persisted; Ctrl/Cmd+B | `design.json` describes a mobile bottom nav only. The web dashboard needs a sidebar; sizing is shadcn's. |
| `Breadcrumb` | Exists at all; separator is a `ChevronRightIcon` | Not in `design.json`. Needed for the admin CRUD detail pages. |
| `Dialog` / `AlertDialog` | `rounded-2xl` (28px = the spec's `xl`), `shadow-float`, blurred scrim | The spec names a scrim but no modal geometry. |
| `Tooltip` | Dark chrome bubble | The spec names no tooltip; chrome tokens keep it readable in both themes. |
| `Accordion` | Items as separated cards, not a bordered stack | Follows `elevation.guidelines` ("group with elevation and whitespace") rather than inventing hairlines. |
| `Combobox` | Chip surface for multi-select | The spec has chips but no combobox. Chips reuse `Badge` geometry. |
| `Skeleton` | `animate-pulse rounded-lg bg-muted` | No loading spec on web. Native's skeleton additionally respects `AccessibilityInfo.isReduceMotionEnabled()` — **web should match that before shipping animated skeletons.** |
| `Button size="xs"` / `sm` | 32 / 36px, below the 44px minimum | A deliberate desk-density escape hatch for the dashboard. Documented in §6.1; never on native-shaped surfaces. |
| Status colours (success / warning / info) | **None on web** | See deviation #4. Use `Badge variant="secondary"` + a Lucide icon + a text label until tokens exist. Do **not** hardcode `#35C48B` / `#FFB020` / `#2F80ED`. |
| Charts | `--chart-1..5` only | No chart spec. `--chart-1` is the orange family; the rest are unrelated hues. Never colour a chart by hardcoded hex. |

---

## Anti-Patterns (Do NOT Use)

- **`text-primary` / `text-brand-accent` for copy.** 2.42:1. Use `text-accent-fg`.
- **`text-white` on an accent fill.** 2.83:1. Use `text-primary-foreground` / `--brand-on-accent`.
- **`text-foreground` / `text-muted-foreground` on `bg-chrome`.** Use `text-chrome-foreground` / `text-chrome-muted`.
- **Confusing `bg-accent` (hover wash) with the brand accent.** Orange fill is `bg-primary`; orange wash is `bg-accent-soft`.
- **Hardcoded hex anywhere in an app.** Every colour goes through a token.
- **Importing `brandCore` in a component.** Go through `brandColors` / the CSS vars.
- **Barrel imports** (`@brnit/ui`). Deep paths only.
- **`asChild`.** Base UI uses `render`.
- **Tailwind's stock `shadow-sm` / `shadow-md` / `shadow-lg`.** Use `shadow-soft` / `shadow-float`.
- **Visible borders around cards.** Group with elevation and whitespace.
- **Square corners.** `rounded-lg` (20px) is the floor for a surface.
- **Per-page duplicate shell padding** (`p-4 md:p-6` inside `ShellPage`).
- **Inline ad-hoc `<h1>`** when `ShellPageHeader` exists; more than one `<h1>` per page.
- **Emojis as icons.** Lucide only.
- **Missing `cursor-pointer`** on clickable rows/cards.
- **Layout-shifting hovers** — hover `scale`/`translate` on cards or buttons. Press is `active:scale-[0.98]`.
- **Touch targets below 44px** outside the documented `xs`/`sm` desk escape hatch.
- **`role="link"` on `BreadcrumbPage`** or **`role="group"` on `Field`.** See §8.
- **Raw strings in toasts.** Always translation keys.
- **Field errors in a banner, or server errors in `FormFieldError`.** Keep the split.
- **Overusing orange.** It marks the primary action, the active state, and progress fill. Nothing else.
- **Purple as an action colour.** `--brand-decorative` is the corner blob and illustration tint only.

---

## Pre-Delivery Checklist

- [ ] Every colour is a token — no hex, no `brandCore`, no stock Tailwind palette classes
- [ ] Accent used as fill only; accent-coloured copy uses `text-accent-fg`
- [ ] Copy on any accent fill is `text-primary-foreground`; copy on chrome is `text-chrome-foreground` / `text-chrome-muted`
- [ ] Renders correctly in **both** light and dark (`html.dark`) — no JS theme branching
- [ ] Imports are deep paths into `@brnit/ui/components/*`; no barrel
- [ ] Shell owns padding; `ShellPage` width variant matches §7.2; exactly one `<h1>`
- [ ] Radii come from the ladder (§4); surfaces are `rounded-lg` or larger
- [ ] Elevation is `shadow-soft` / `shadow-float`; no card borders
- [ ] Interactive elements: `cursor-pointer`, visible focus ring, `active:scale-[0.98]`, no hover layout shift
- [ ] Touch targets ≥ 44px (documented `xs`/`sm` exceptions only)
- [ ] Icon-only controls have `sr-only` text or `aria-label`; decorative icons `aria-hidden`
- [ ] `aria-invalid` flows through `FormField`; errors carry `role="alert"`; server errors are in a separate banner
- [ ] `SubmitButton` is the submit control — no bare `<Button type="submit">`
- [ ] Status is never colour-alone
- [ ] Empty, loading and error states all exist
- [ ] **Responsive checked at 375 / 390 / 768 / 1024 / 1440** — designed mobile-first
- [ ] `bun x ultracite check` is clean
