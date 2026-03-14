import { ApiError } from "./types";

/**
 * Returns a user-facing error message from an unknown error, with optional
 * overrides for specific API status codes (e.g. 409, 404).
 */
export function getApiErrorMessage(
  error: unknown,
  fallback: string,
  statusMessages?: Partial<Record<number, string>>
): string {
  if (error instanceof ApiError && statusMessages?.[error.status] !== undefined) {
    return statusMessages[error.status];
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
