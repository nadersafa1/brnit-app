import type { AssessmentDto } from "@brnit/api";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@brnit/ui/components/dialog";

import { AssessmentForm } from "@/components/direct-admin/assessment-form";
import { useUpdateAssessmentForm } from "@/hooks/use-assessment-form";

const ID_PREFIX = "edit-assessment";

/** Mounted under `key={assessment.id}` so each row edits from its own values. */
function EditAssessmentFormBody({
	assessment,
	onCancel,
	onSaved,
}: Readonly<{
	assessment: AssessmentDto;
	onCancel: () => void;
	onSaved: () => void;
}>) {
	const binding = useUpdateAssessmentForm({ assessment, onSaved });

	return (
		<AssessmentForm
			binding={binding}
			hasImage={assessment.imageUrl !== null}
			idPrefix={ID_PREFIX}
			imageLabel="Replace the InBody result image"
			onCancel={onCancel}
			submitLabel="Save changes"
		/>
	);
}

interface EditAssessmentDialogProps {
	/** `null` closes the dialog — the row being edited is what opens it. */
	assessment: AssessmentDto | null;
	onClose: () => void;
}

export function EditAssessmentDialog({
	assessment,
	onClose,
}: Readonly<EditAssessmentDialogProps>) {
	return (
		<Dialog
			onOpenChange={(next) => {
				if (!next) {
					onClose();
				}
			}}
			open={assessment !== null}
		>
			<DialogContent className="max-h-[90svh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Edit assessment</DialogTitle>
					<DialogDescription>
						A field left blank is left unchanged — clearing one never resets the
						metric to zero.
					</DialogDescription>
				</DialogHeader>
				{assessment ? (
					<EditAssessmentFormBody
						assessment={assessment}
						key={assessment.id}
						onCancel={onClose}
						onSaved={onClose}
					/>
				) : null}
			</DialogContent>
		</Dialog>
	);
}
