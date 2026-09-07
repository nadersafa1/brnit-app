import { cn } from "@brnit/ui/lib/utils";
import type * as React from "react";

/**
 * Structurally compatible with react-hook-form's `FieldError` without taking a
 * dependency on it, so `@brnit/ui` stays form-library agnostic.
 */
export interface FormFieldErrorLike {
	message?: string;
}

interface FormFieldErrorProps extends React.ComponentProps<"p"> {
	error?: FormFieldErrorLike;
}

/**
 * The only sanctioned place a *field-level* error is rendered. Server-level
 * failures belong in a separate banner — keep that split (see
 * `docs/migration/frontend.md` -> Forms).
 */
export function FormFieldError({
	className,
	error,
	...props
}: Readonly<FormFieldErrorProps>) {
	if (!error?.message) {
		return null;
	}

	return (
		<p
			className={cn("text-destructive text-sm", className)}
			data-slot="form-field-error"
			role="alert"
			{...props}
		>
			{error.message}
		</p>
	);
}
