import { Button } from "@brnit/ui/components/button";
import { Loader2Icon } from "lucide-react";

interface SubmitButtonProps {
	className?: string;
	disabled?: boolean;
	idleLabel: string;
	isSubmitting: boolean;
	pendingLabel?: string;
}

/**
 * The only sanctioned submit control: shows a spinner and disables itself while
 * the mutation is in flight, so no form can double-submit.
 */
export function SubmitButton({
	className,
	disabled = false,
	idleLabel,
	isSubmitting,
	pendingLabel = "Submitting…",
}: Readonly<SubmitButtonProps>) {
	return (
		<Button
			className={className}
			data-slot="submit-button"
			disabled={disabled || isSubmitting}
			type="submit"
		>
			{isSubmitting ? (
				<>
					<Loader2Icon aria-hidden className="size-4 animate-spin" />
					{pendingLabel}
				</>
			) : (
				idleLabel
			)}
		</Button>
	);
}
