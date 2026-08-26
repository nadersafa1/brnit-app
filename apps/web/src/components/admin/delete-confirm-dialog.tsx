import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@brnit/ui/components/alert-dialog";
import type { ReactNode } from "react";

import { NutritionConflictNotice } from "@/components/nutrition/nutrition-conflict-notice";

interface DeleteConfirmDialogProps {
	confirmLabel?: string;
	/** A 409 from the last attempt. Keeps the dialog open and explains why. */
	conflictMessage?: string | null;
	description: ReactNode;
	isDeleting: boolean;
	onConfirm: () => void;
	onOpenChange: (open: boolean) => void;
	open: boolean;
	pendingLabel?: string;
	title: string;
}

/**
 * One confirmation for every destructive action in the admin section.
 *
 * The reason it is shared rather than written per screen: a blocked delete
 * answers **409**, and the dialog must *stay open* and say what is blocking it
 * instead of closing onto a toast. Centralising that keeps the four delete
 * surfaces (category, meal, diet plan, user) from each inventing their own
 * handling of the same refusal.
 */
export function DeleteConfirmDialog({
	confirmLabel = "Delete",
	conflictMessage = null,
	description,
	isDeleting,
	onConfirm,
	onOpenChange,
	open,
	pendingLabel = "Deleting…",
	title,
}: Readonly<DeleteConfirmDialogProps>) {
	return (
		<AlertDialog onOpenChange={onOpenChange} open={open}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<NutritionConflictNotice
					message={conflictMessage}
					title="This cannot be deleted yet"
				/>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						disabled={isDeleting}
						nativeButton
						onClick={onConfirm}
						variant="destructive"
					>
						{isDeleting ? pendingLabel : confirmLabel}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
