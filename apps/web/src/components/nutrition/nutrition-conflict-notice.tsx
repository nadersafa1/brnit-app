import { Card, CardContent } from "@brnit/ui/components/card";
import { TriangleAlertIcon } from "lucide-react";

interface NutritionConflictNoticeProps {
	/** `readConflictMessage(mutation.error)`. `null` renders nothing. */
	message: string | null;
	/** Overrides the heading when a screen can name the blocked action. */
	title?: string;
}

/**
 * The UI a **409** gets on the nutrition catalog screens.
 *
 * A blocking-reference refusal is a rule the user has to act on — remove the
 * meal's items, take the meal out of the plan, clone the assigned plan — not a
 * transient failure. A toast would vanish before it could be read and leaves no
 * trace of *why* the button did nothing, so the server's sentence stays on
 * screen until the write is retried. React Query clears `error` on the next
 * attempt, which is what makes this stateless.
 */
export function NutritionConflictNotice({
	message,
	title = "This change is blocked",
}: Readonly<NutritionConflictNoticeProps>) {
	if (message === null) {
		return null;
	}

	return (
		<Card className="border-destructive/40 bg-destructive/5">
			<CardContent className="flex items-start gap-3 p-4" role="alert">
				<TriangleAlertIcon
					aria-hidden
					className="mt-0.5 size-5 shrink-0 text-destructive"
				/>
				<div className="space-y-1">
					<p className="font-semibold text-destructive text-sm">{title}</p>
					<p className="text-muted-foreground text-sm">{message}</p>
				</div>
			</CardContent>
		</Card>
	);
}
