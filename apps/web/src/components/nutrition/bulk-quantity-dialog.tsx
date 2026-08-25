import { Button } from "@brnit/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@brnit/ui/components/dialog";
import { FormField } from "@brnit/ui/components/form-field";
import { Input } from "@brnit/ui/components/input";
import { useState } from "react";

const QUANTITY_MIN = 0.1;
const QUANTITY_STEP = 1;

interface BulkQuantityDialogProps {
	isSaving: boolean;
	onConfirm: (quantity: number) => void;
	onOpenChange: (open: boolean) => void;
	open: boolean;
	selectedCount: number;
}

/**
 * Sets one quantity across every selected line.
 *
 * The step is deliberately unit-agnostic: a selection can mix grams with
 * pieces, and there is no single increment that suits both — the server
 * validates each line against its own food.
 */
export function BulkQuantityDialog({
	isSaving,
	onConfirm,
	onOpenChange,
	open,
	selectedCount,
}: Readonly<BulkQuantityDialogProps>) {
	const [draft, setDraft] = useState("");
	const [error, setError] = useState<string | null>(null);

	const handleOpenChange = (next: boolean) => {
		if (!next) {
			setDraft("");
			setError(null);
		}
		onOpenChange(next);
	};

	const handleConfirm = () => {
		const quantity = Number.parseFloat(draft);
		if (Number.isNaN(quantity) || quantity <= 0) {
			setError("Enter a positive number");
			return;
		}
		setError(null);
		onConfirm(quantity);
	};

	return (
		<Dialog onOpenChange={handleOpenChange} open={open}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Set quantity</DialogTitle>
					<DialogDescription>
						Applies to {selectedCount} selected{" "}
						{selectedCount === 1 ? "item" : "items"}.
					</DialogDescription>
				</DialogHeader>
				<FormField
					error={error ? { message: error } : undefined}
					htmlFor="bulk-quantity"
					label="Quantity"
				>
					<Input
						disabled={isSaving}
						id="bulk-quantity"
						inputMode="decimal"
						min={QUANTITY_MIN}
						onChange={(event) => setDraft(event.target.value)}
						placeholder="e.g. 100"
						step={QUANTITY_STEP}
						type="number"
						value={draft}
					/>
				</FormField>
				<DialogFooter>
					<Button
						disabled={isSaving}
						onClick={() => handleOpenChange(false)}
						variant="outline"
					>
						Cancel
					</Button>
					<Button
						disabled={isSaving || draft.trim() === ""}
						onClick={handleConfirm}
					>
						{isSaving ? "Saving…" : "Apply"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
