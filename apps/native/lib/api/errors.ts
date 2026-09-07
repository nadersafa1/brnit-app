import type { ApiErrorDetails } from "./types";

export function getFieldErrors(
	details: ApiErrorDetails | undefined,
	fieldName: string
): string[] {
	return details?.fieldErrors?.[fieldName] ?? [];
}

export function getFirstFieldError(
	details: ApiErrorDetails | undefined,
	fieldName: string
): string | undefined {
	return getFieldErrors(details, fieldName)[0];
}

export function getFormErrors(details: ApiErrorDetails | undefined): string[] {
	return details?.formErrors ?? [];
}

export function hasFieldError(
	details: ApiErrorDetails | undefined,
	fieldName: string
): boolean {
	return getFieldErrors(details, fieldName).length > 0;
}
