import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@brnit/ui/components/dialog";

import { AssessmentForm } from "@/components/direct-admin/assessment-form";
import { memberDisplayName } from "@/components/direct-admin/member-display";
import { useCreateAssessmentForm } from "@/hooks/use-assessment-form";
import type { OrganizationMemberRow } from "@/hooks/use-assessment-members";

const ID_PREFIX = "add-assessment";

/**
 * Kept out of the dialog so the form is created fresh per member: the dialog
 * mounts it under `key={member.id}`, and react-hook-form's `defaultValues` are
 * only read on mount.
 */
function AddAssessmentFormBody({
	memberId,
	onCancel,
	onSaved,
}: Readonly<{ memberId: string; onCancel: () => void; onSaved: () => void }>) {
	const binding = useCreateAssessmentForm({ memberId, onSaved });

	return (
		<AssessmentForm
			binding={binding}
			hasImage={false}
			idPrefix={ID_PREFIX}
			imageLabel="InBody result image (optional)"
			onCancel={onCancel}
			submitLabel="Add assessment"
		/>
	);
}

interface AddAssessmentDialogProps {
	/** `null` closes the dialog — the target member is what opens it. */
	member: OrganizationMemberRow | null;
	onClose: () => void;
}

export function AddAssessmentDialog({
	member,
	onClose,
}: Readonly<AddAssessmentDialogProps>) {
	return (
		<Dialog
			onOpenChange={(next) => {
				if (!next) {
					onClose();
				}
			}}
			open={member !== null}
		>
			<DialogContent className="max-h-[90svh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Add assessment</DialogTitle>
					<DialogDescription>
						{member
							? `Record a body composition assessment for ${memberDisplayName(member)}.`
							: null}
					</DialogDescription>
				</DialogHeader>
				{member ? (
					<AddAssessmentFormBody
						key={member.id}
						memberId={member.id}
						onCancel={onClose}
						onSaved={onClose}
					/>
				) : null}
			</DialogContent>
		</Dialog>
	);
}
