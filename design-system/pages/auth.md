# Auth screens — web and native

> Overrides `MASTER.md` for every unauthenticated screen plus `complete-profile`.
> Everything not stated here follows MASTER.

## Screens covered

From `docs/migration/api-surface.md` §10.

| Web route | Native route | Purpose |
| --- | --- | --- |
| `/login` | `(auth)/login` | Email + password, OAuth |
| `/signup` | `(auth)/sign-up` | Registration → email verification |
| `/forgot-password` | `(auth)/forgot-password` | Request a reset link |
| `/reset-password` | `(auth)/reset-password` | Token-carrying, set new password |
| `/complete-profile` | `(auth)/complete-profile` | **`dob` gate** — blocks the dashboard until set |
| `/accept-invitation` | `accept-invitation` | Deep link `brnit://accept-invitation?invitationId=` |
| `/` | `(onboarding)/index`, `(auth)/index` | Landing / onboarding |

Providers (better-auth): email + password, email verification, password reset,
**Google** and **Apple** OAuth.

## Layout

**These screens are outside the shell.** No `AppSidebarShell`, no `ShellPage`, no
sidebar, no breadcrumb.

### Web

- Full-height centred column on `bg-background` (the blush canvas).
- One `Card` — `max-w-sm`, `mx-auto`, `shadow-float` (this is the only thing on screen,
  so it earns the stronger elevation).
- Page padding `p-4`; the card is full width below `sm`.
- Optional `--brand-decorative` corner blob anchored top-right, partially off-canvas,
  behind the card. **`aria-hidden`, `pointer-events-none`, never overlapping copy.**
- Exactly one `<h1>` — the card title. No `ShellPageHeader` here.

### Native

- `(auth)` stack, no tab bar, no floating `BottomNav`.
- Content is vertically centred with `spacing[6]` between bands, `spacing[4]` screen padding.
- Wrap in a keyboard-avoiding scroll view — the password fields must stay visible with
  the keyboard up.

## Brand mark

`brandAssetPaths` in `packages/brand/src/tokens.ts`:

| Asset | File | Aspect | Use |
| --- | --- | --- | --- |
| `lockup` | `logo-lockup.png` | 1066 / 467 | App headers, auth card, email header |
| `cover` | `logo-cover.png` | 1080 / 1350 (4:5) | Splash, store listings, share cards |

> **Both files are the wordmark on a white ground.** There is no dark-ground variant.
> Place them on `card` / `#FFFFFF` — **never on `navPill`, never on the dark-mode
> `appBg`.** In dark mode the mark must sit on a `card` surface, not float on charcoal.

Use `brandAspectRatios` to size the image; never hardcode width and height separately.

## Form

- Same primitives as the dashboard: `FormField` → `Input` → `FormFieldError`,
  `SubmitButton` for submit. Do not fork an auth-only input.
- `Input` at default `size` (44px) — auth is thumb-first on both platforms.
- Password fields get a show/hide toggle: `Button variant="ghost" size="icon-sm"` with an
  `aria-label` that reflects the current state ("Show password" / "Hide password").
  Native uses `components/ui/password-input.tsx`.
- `autoComplete` is mandatory: `email`, `current-password`, `new-password`, `name`, `bday`.
- `inputMode="email"` on the email field.
- `dob` on complete-profile: `YYYY-MM-DD`, **must be in the past**. Native uses
  `components/dob-picker.tsx`.
- `SubmitButton` is full width on auth screens (`className="w-full"`) — the only place
  MASTER's "primary action sits in a footer row" is relaxed.

## OAuth

- Google and Apple sit **above** the email form, separated by a `FieldSeparator` carrying
  the word "or".
- Each is a `Button variant="secondary"` (white pill + `shadow-soft`), full width, with
  the provider mark at 20px and a text label. `variant="default"` is reserved for the
  one primary action.
- Provider marks are brand assets, not Lucide icons, and not recoloured. They are the
  one sanctioned exception to the "no hardcoded colour" rule — scope them to the icon
  component.
- Apple sign-in must be present on iOS wherever Google is.

## Errors

- **Auth failures are banner errors**, never field errors: a wrong password is not a
  malformed field. Render a `role="alert"` block at the top of the card, inside it, above
  the first field.
- Never say which half of the credential pair was wrong.
- Field errors (malformed email, password too short, `dob` in the future) stay in
  `FormFieldError` under their control.
- Rate limiting and expired reset tokens are banner errors with a recovery action —
  "Request a new link" as `Button variant="link"`.
- `accept-invitation` failure states (expired, already accepted, wrong account) each get
  their own copy and their own next step. Do not collapse them into one message.

## Links between screens

- Secondary navigation ("Forgot password?", "Create an account", "Back to sign in") is
  `Button variant="link"` — `text-accent-fg`, the readable accent.
  **Never `text-primary`** (2.42:1).
- One secondary link per row, `text-sm`, centred under the submit button.

## States

| State | Treatment |
| --- | --- |
| Submitting | `SubmitButton` spinner; the whole form is disabled |
| Verification sent | Replace the form with a confirmation panel: icon in a ring, what happened, and a resend action. Do not leave a dead form on screen |
| Reset link expired | Banner + "Request a new link" |
| Already signed in | Redirect from the route guard, not a rendered message |
| Offline | Banner above the card; submit disabled with an explanatory hint |

## Responsive

| Width | Behaviour |
| --- | --- |
| 375 | Card is full width inside `p-4`; buttons full width; blob may be suppressed |
| 640 (`sm`) | Card caps at `max-w-sm`, centred |
| 768+ | Unchanged — auth never widens. Do not add a marketing split-panel |

## Anti-patterns for these screens

- `ShellPage` / `ShellPageHeader` / sidebar / breadcrumb on an auth screen
- Auth failures rendered as field errors, or as a toast
- Naming which credential was wrong
- `text-primary` on the secondary links
- Placing the wordmark on `navPill` or on the dark-mode canvas
- Missing `autoComplete`, or a password toggle with no `aria-label`
- OAuth buttons as `variant="default"` — that competes with the real primary action
- A dead form left on screen after "check your email"
- Decorative blob overlapping copy, or without `aria-hidden`
- Widening the card past `max-w-sm` on desktop
