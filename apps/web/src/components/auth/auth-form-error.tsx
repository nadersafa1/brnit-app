import { AlertCircleIcon } from "lucide-react";

/**
 * The **server**-error banner.
 *
 * Field-level validation belongs in `FormFieldError` next to its input; a
 * rejected sign-in ("invalid credentials", "account banned") belongs to the
 * form as a whole and has no field to sit under. Keeping the two channels
 * separate is why an unrelated password rule never claims the server's reason.
 */
export function AuthFormError({ message }: Readonly<{ message: string }>) {
	return (
		<div
			className="flex items-start gap-2 rounded-xl bg-destructive/10 px-3 py-2.5 text-destructive text-sm"
			role="alert"
		>
			<AlertCircleIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
			<span>{message}</span>
		</div>
	);
}
