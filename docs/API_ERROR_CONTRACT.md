# API JSON error contract

All `apps/web` API routes that return a JSON error body should use this shape:

```ts
{ "error": string, "details"?: unknown }
```

- **`error`** (required): Short message safe to show in toasts or generic error UI.
- **`details`** (optional): Structured data for validation (e.g. Zod `flattenError` output) or debugging. Clients should not treat `details` as the primary user-facing string.

Use `apiErrorResponse` from `@/lib/api-helpers/api-error-response` (also re-exported from `@/lib/api-helpers`) to avoid divergent field names.

The browser client reads **`error`** in `getApiErrorMessage` (`@/lib/api/error-handling`). List/detail query fetchers use **`fetchJsonWithCredentials`** (`@/lib/api/fetch-with-credentials`), which shares the same success/error handling as hooks.

**Audit note:** Standard `app/api` error payloads include `error`. Some auth helpers (e.g. organization context) may add extra top-level fields such as `code` / `message`; clients should still prefer **`error`** for display.
