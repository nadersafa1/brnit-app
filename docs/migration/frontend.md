# brnit-app — Frontend Architecture

Reference implementation: `../qpadel`. Read the named files there rather than
inventing conventions.

## Stack

| | Web | Native |
| --- | --- | --- |
| Framework | **Vite 6 + TanStack Router** (file-based, SPA) | Expo Router |
| Data | TanStack Query | TanStack Query |
| Styling | Tailwind v4 (CSS-first, no `tailwind.config.js`) | `StyleSheet.create` + theme modules |
| Components | `@brnit/ui` (base-ui + CVA) | local `components/ui` primitives |
| Tokens | `@brnit/brand/brand.css` | `@brnit/brand/tokens` |
| Forms | react-hook-form + zod resolver | `useState` + zod schemas |
| Theme | `next-themes` in class mode | Zustand + MMKV |

> **No RSC anywhere.** `"rsc": false`. Everything is a client component; data is
> fetched in the browser via TanStack Query against `apps/server`.

## `@brnit/brand`

Zero-dependency, source-only. **No build step** — consumers import `.ts` and
`.css` directly.

```json
"exports": {
  ".":           { "default": "./src/tokens.ts" },
  "./tokens":    { "default": "./src/tokens.ts" },
  "./brand.css": "./src/brand.css",
  "./assets/*":  "./assets/*"
}
```

Two source files, **hand-kept in sync** (there is no codegen between them):

- `src/tokens.ts` — for JS/TS consumers (React Native, email templates)
- `src/brand.css` — for CSS consumers (the web app)

### Token source

brnit already has a complete design spec at **`design.json`** (Pastel Soft UI:
off-white/blush surfaces, high-contrast black type, vivid orange `#FD6E20`
accent, large radii, soft blurred shadows, 4px spacing scale). That file is the
input for `@brnit/brand` — port its `color`, `typography`, `shape`, `elevation`
and `motion` sections into tokens rather than inventing a palette.

Unlike qpadel (which is dark-first), brnit is **light-first**. Define the
complete light palette on `:root` and override under `html.dark`.

### Accessibility invariants to encode

Copy qpadel's discipline of naming tokens by *role*, not by value, so misuse is
visible at the call site:

- `accent` is a **fill only**. `accentFg` is the readable text version — a
  vivid orange on off-white will not pass contrast as body text.
- `onAccent` is the only legal copy colour on an accent fill.
- Any chrome surface that stays a fixed colour across themes needs its own
  `chromeFg` / `chromeMuted` pair; `ink` / `muted` are wrong on it.

React Native note: prefer `rgba(r, g, b, a)` with 0–1 alpha. Modern CSS
`rgb(… / 28%)` can fail native parsing and render as black.

### Where the other scales live

Radii, spacing, typography and shadows are **not** in `@brnit/brand` — they are
per-platform, because the two platforms want different geometry from the same
palette:

- **Web**: `--radius` in `@brnit/ui/globals.css` plus a derived
  `--radius-sm|md|lg|xl|2xl|3xl|4xl` ladder; Tailwind v4 defaults for spacing.
- **Native**: `apps/native/theme/{colors,radii,spacing,typography,shadows}.ts`.
  Shadows are tinted in light mode, black in dark. Use
  `borderCurve: "continuous"` on rounded surfaces for iOS squircles.

### Token flow — web

```
apps/web/src/index.css
  └─ @import "@brnit/ui/globals.css"
       ├─ @import "tailwindcss"
       ├─ @import "tw-animate-css"
       ├─ @import "shadcn/tailwind.css"
       └─ @import "@brnit/brand/brand.css"   ← brand vars land here
```

`packages/ui/src/styles/globals.css` also declares the source globs so Tailwind
scans the apps from inside the package:

```css
@source "../../../apps/**/*.{ts,tsx}";
@source "../**/*.{ts,tsx}";
@custom-variant dark (&:is(.dark *));
```

Then `apps/web/src/index.css` does two things:

1. **Remaps every shadcn semantic var onto a brand var**
   (`--background: var(--brand-app)`, `--primary: var(--brand-accent)`, …).
2. **Re-exposes brand vars as Tailwind utilities** via `@theme inline`
   (`--color-brand-accent: var(--brand-accent)` → `bg-brand-accent`).

Net effect: two parallel class vocabularies that resolve to the same values —
`bg-card / text-muted-foreground` (shadcn semantics, used *inside* `@brnit/ui`)
and `bg-brand-card / text-brand-muted` (brand-explicit, used in app chrome).

### Token flow — native

No CSS. `apps/native/theme/colors.ts` imports the TS tokens and merges
platform-only semantics (`success`, `warning`, `danger`, `info`, …), exposed
through a `useColors()` hook. Also feeds React Navigation via a `NAV_THEME`
constant.

## `@brnit/ui`

**No barrel file.** Every import is a deep path:
`import { Button } from "@brnit/ui/components/button"`. Knip and Ultracite
forbid barrels.

```json
"exports": {
  "./globals.css":    "./src/styles/globals.css",
  "./lib/*":          "./src/lib/*.ts",
  "./components/*":   "./src/components/*.tsx",
  "./hooks/*":        "./src/hooks/*.ts",
  "./postcss.config": "./postcss.config.mjs"
}
```

Base: Tailwind v4 + **`@base-ui/react`** primitives + CVA. This is **not** Radix
— brnit's web currently uses Radix and `radix-ui`; those get replaced.
`@base-ui/react` uses a `render` prop for polymorphism, not `asChild`.

House conventions (visible in every qpadel component):

- Every root element carries `data-slot="<name>"` for styling and test hooks.
- CVA where there is more than one visual variant; plain `cn()` otherwise.
- `aria-invalid:` variants baked into every form control.
- `cn()` is the only thing in `src/lib/` — `twMerge(clsx(inputs))`.

> **brnit deviation:** qpadel is a dense desk/admin UI — `--radius: 0`,
> `text-xs` default, `h-6/h-7/h-8/h-9` controls. brnit's `design.json` calls for
> the opposite: large radii, pills, generous whitespace, comfortable density,
> thumb-friendly controls. **Follow `design.json`, not qpadel's geometry.** Copy
> qpadel's *structure* (base-ui, CVA, data-slot, token indirection); take the
> visual language from `design.json`.

Component inventory to port (qpadel's 22 modules are the baseline):
`accordion, badge, button, card, chart, checkbox, dialog, dropdown-menu, input,
label, popover, scroll-area, select, separator, sheet, skeleton, sonner, table,
tabs, textarea`. brnit additionally needs whatever its existing
`apps/web/src/components/ui` provides beyond that (combobox, alert-dialog,
form primitives) — audit before dropping anything.

## Web app structure

```
apps/web/src/
├── main.tsx              bootstrap
├── index.css             brand→shadcn var mapping + @theme inline
├── routeTree.gen.ts      generated by @tanstack/router-plugin
├── routes/               FILE-BASED ROUTES — thin
├── pages/                ACTUAL SCREEN COMPONENTS (lazy-loaded by routes)
├── components/
│   ├── shell/            AppSidebarShell, ShellTopBar, ShellPage,
│   │                     ShellPageHeader, ShellEmptyState, ShellNavGroup
│   └── ui/               app-specific: FormField, FormFieldError, SubmitButton
├── hooks/                feature hooks (use-*-page, use-*-mutation, use-*-form)
├── lib/api/              client.ts, fetch-with-credentials.ts, error-handling.ts,
│                         query-keys.ts, queries/*.ts
├── stores/               zustand
└── utils/                query-client.ts, query-error-toast.ts, query-retry.ts
```

### The route ⇄ page split — the core convention

`routes/**` files stay ~25 lines. They declare `head`, `validateSearch`,
`beforeLoad`, `loader`, and render a `lazyPage(...)` inside `<Suspense>`. **All
UI lives in `pages/**`.**

```tsx
const PlayersPage = lazyPage(() => import("@/pages/venue-owner/players-page"), "PlayersPage");

export const Route = createFileRoute("/venue-owner/players/")({
	head: () => createTranslatedStandardPageHead("meta.players"),
	validateSearch: parseVenuePlayersSearch,
	component: PlayersRoute,
});

function PlayersRoute() {
	return (
		<Suspense fallback={<Loader />}>
			<PlayersPage />
		</Suspense>
	);
}
```

`lib/lazy-page.ts` wraps `React.lazy` with named-export lookup **and chunk-load
error recovery** (auto-reloads once after a stale deploy).

### Auth gating

Happens in route-group `route.tsx` `beforeLoad`, throwing `redirect()`. This is
where brnit's current server-component gates go. Reference:
`apps/web/src/routes/admin/route.tsx` and `routes/venue-owner/route.tsx`.

Router context carries the query client
(`createRootRouteWithContext<{ queryClient: QueryClient }>()`), so `loader`s can
prefetch.

brnit's gates to port:

| Current | Becomes |
| --- | --- |
| `app/dashboard/layout.tsx` — redirect to `/login` without session, `/complete-profile` without `dob` | `routes/dashboard/route.tsx` `beforeLoad` |
| `app/dashboard/admin/layout.tsx` — `user.role === 'admin'` | `routes/dashboard/admin/route.tsx` `beforeLoad` |
| `DashboardSegmentGate` for nutritionist / direct-admin | `beforeLoad` on those route groups |

### Shell

`AppSidebarShell` owns layout padding (`p-4 md:p-6` on `<main>`) — **pages never
repeat it**. `ShellPage` applies a width class + `space-y-6`; `ShellPageHeader`
renders eyebrow / title / description / actions and is the only `<h1>`.

## API client

**No generated client, no react-query codegen.** Types come from `@brnit/api`;
URLs are hand-written strings. Three layers:

1. `lib/api/client.ts` — `fetchApiJson<T>(path, options)` prefixes
   `VITE_SERVER_URL` and rewrites `/api/` → `/api/v{VITE_API_VERSION}/`.
2. `lib/api/fetch-with-credentials.ts` — `credentials: "include"`, 30 s
   `AbortSignal.timeout`, sets `Content-Type: application/json` unless the body
   is `FormData`.
3. `lib/api/error-handling.ts` — parses `{ error, details }` into a thrown
   `ApiRequestError(message, { code, status })`.

Native differs in one important way: it attaches `Cookie:` manually from
`authClient.getCookie()` (SecureStore-backed) and uses `credentials: "omit"`.
brnit's native app already does exactly this — keep it.

## Data fetching conventions

### Query client

```ts
new QueryClient({
	defaultOptions: { queries: { retry: shouldRetryQuery, staleTime: 30_000 } },
	queryCache: new QueryCache({
		onError: (error, query) => {
			if (!query.meta?.showErrorToast) return;   // opt-in
			if (!onlineManager.isOnline()) return;     // suppressed offline
			showDedupedErrorToast(getUserFacingErrorMessage(error), {
				onRetry: () => query.invalidate(),
			});
		},
	}),
});
```

- `shouldRetryQuery` — never retry 4xx, cap at 3.
- `showDedupedErrorToast` — 5 s dedupe window keyed on message, with a Retry
  action.
- `types/react-query.d.ts` augments `Register` with
  `queryMeta: { showErrorToast?: boolean }` so the opt-in is typed.

### Query keys

**One central module** exporting **typed factory functions**, not nested
objects:

```ts
export function foodItemsQueryKey(
	filters: { page: number; perPage: number; q: string; sortBy: string }
): readonly ["food-items", string, string, number, number] { … }

/** Prefix for invalidating all food-item list queries. */
export function foodItemsQueries(): readonly ["food-items"] { … }
```

Rules: kebab-case string at element 0; explicit `readonly [...]` tuple return
type; **most-stable segments first** so prefix invalidation works; a
`…Queries` / `…ForOrganization` prefix companion for every paginated key.

### queryOptions modules

Queries are never inlined in components. `lib/api/queries/*.ts` export
`queryOptions(...)` factories; components call
`useQuery(foodItemsQueryOptions(filters))`. `enabled: id.length > 0` is the
standard "nothing selected yet" guard.

### Mutations

Each is its own `use-*-mutation.ts` hook:
`mutationFn` → `onError: toast.error(...)` → `onSuccess: toast.success(...)` +
`await Promise.all([invalidateQueries…])`. Complex fan-outs get a **named
invalidation helper** so the set stays consistent across call sites.

Optimistic updates use the full `onMutate` → `cancelQueries` → snapshot →
`setQueryData` → return context; `onError` restore; `onSettled` invalidate
(skipped when `error`).

## Forms

react-hook-form + `@hookform/resolvers/zod` + zod 4. **No shadcn `Form`
component** — a minimal local trio instead:

- `FormField` — `Label` + child + `FormFieldError`, cloning the child to inject
  `aria-invalid` when errored.
- `FormFieldError` — `<p className="text-destructive text-sm" role="alert">`.
- `SubmitButton` — the only sanctioned submit control; shows a spinner and
  disables while submitting.

Universal conventions:

- `mode: "onBlur"` on every `useForm`.
- A `use-*-form.ts` hook owns schema + `useForm` + `useMutation` + `onSubmit`
  and returns `{ form, onSubmit, isSaving }`. **The `.tsx` is layout only.**
- `Controller` for non-native inputs; `form.register(...)` for plain ones.
- **Field errors go to `FormFieldError`; server errors go to a separate banner.**
  Keep that split.

> brnit currently has both `@tanstack/react-form` and `react-hook-form`
> installed. Standardise on **react-hook-form** and drop the other.

## Theming

Web: `next-themes` with `attribute="class"`. Because `brand.css` scopes the
palette by `:root` / `html.dark` and `index.css` re-declares the shadcn mapping
identically for all three selectors, **theme switching is purely a `--brand-*`
variable swap** — no component ever branches on theme in JS.

FOUC is prevented by a **blocking inline script in `index.html`** that reads the
theme from `localStorage` before first paint and sets
`document.documentElement.classList`. This is required in a Vite SPA — there is
no server render to do it.

## UX conventions

**Loading — three tiers:** route-level (`defaultPendingComponent` + per-page
`Suspense`), query-level (centred spinner), and skeletons.

Native goes further and both details are worth copying:

- Skeleton pulse **respects `AccessibilityInfo.isReduceMotionEnabled()`** and
  subscribes to `reduceMotionChanged`, freezing at full opacity.
- A **minimum-hold** hook (`useSkeletonLoading`) keeps skeletons visible for a
  floor duration so fast responses don't flicker.

**Empty states:** a shared `EmptyState` (icon in a ring, title, body, optional
action). Native uses a compound form (`EmptyState.Root/Icon/Title/Body/Action`).

**Toasts:** `sonner` on web with `richColors`; always `translate(...)` keys,
never raw strings.

**Error boundaries:** router-level `defaultErrorComponent` that swallows
chunk-load errors (auto-reload once) and otherwise renders `role="alert"` plus a
"Try again" that calls `reset?.()` + `router.invalidate()`.

**Offline:** an `<OfflineBanner/>` above everything, driven by a network store
wired to TanStack's `onlineManager`; the global error toast is suppressed while
offline.

### Accessibility checklist

- Skip link in the shell targeting `#<mainId>`.
- Every icon-only control has `<span className="sr-only">` and/or `aria-label`;
  decorative icons get `aria-hidden`.
- `<nav aria-label>`, `<header>`, `<main id>`, exactly one `<h1>` per page.
- Segmented controls are real `<fieldset>` + `<legend className="sr-only">`.
- Focus rings standardised and always visible.
- `aria-invalid` propagated by `FormField`; error text carries `role="alert"`.
- Search inputs and sort selects always take an `aria-label`.

### Anti-patterns

- Emojis as icons — use Lucide.
- Missing `cursor-pointer` on clickable rows/cards.
- Layout-shifting hovers in dense UI.
- Per-page duplicate shell padding.
- Inline ad-hoc `<h1>` when `ShellPageHeader` exists.

## Design-system docs

qpadel keeps markdown design specs at `design-system/` with a resolution
protocol: *"When building a specific page, first check
`design-system/pages/[page].md`. If it exists, its rules override MASTER.md."*

brnit should keep **one** MASTER at `design-system/MASTER.md` derived from
`design.json`, plus per-page overrides. qpadel's repo has two stale generated
snapshots that contradict its own shipped code — do not replicate that; treat
generated snapshots as disposable or omit them entirely.

## Bootstrap sequence — web

```
initTheme (blocking inline script in index.html, before paint)
initNetworkManager()          // onlineManager wiring
registerChunkLoadRecovery()   // stale-deploy guard
createRouter({ routeTree, defaultPreload: "intent",
               defaultPendingComponent, defaultErrorComponent,
               context: { queryClient }, Wrap: QueryClientProvider })
ReactDOM.createRoot(#app).render(<RouterProvider router={router} />)
```

Guard the mount with `if (!rootElement.innerHTML)` so HMR doesn't double-mount.
