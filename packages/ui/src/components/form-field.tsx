import {
	FormFieldError,
	type FormFieldErrorLike,
} from "@brnit/ui/components/form-field-error";
import { Label } from "@brnit/ui/components/label";
import { cn } from "@brnit/ui/lib/utils";
import { cloneElement, isValidElement, type ReactNode } from "react";

interface FormFieldProps {
	children: ReactNode;
	className?: string;
	error?: FormFieldErrorLike;
	htmlFor: string;
	label: string;
}

/**
 * `Label` + control + error. Clones the control to inject `aria-invalid` when
 * errored, so every form control picks up its `aria-invalid:` ring without the
 * caller wiring it by hand.
 */
export function FormField({
	children,
	className,
	error,
	htmlFor,
	label,
}: Readonly<FormFieldProps>) {
	const control =
		isValidElement<{ "aria-invalid"?: boolean }>(children) && error
			? cloneElement(children, { "aria-invalid": true })
			: children;

	return (
		<div
			className={cn("flex flex-col gap-2", className)}
			data-slot="form-field"
		>
			<Label htmlFor={htmlFor}>{label}</Label>
			{control}
			<FormFieldError error={error} />
		</div>
	);
}
