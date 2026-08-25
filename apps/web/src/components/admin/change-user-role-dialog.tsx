import { APP_ROLES, type AppRole } from "@brnit/domain";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@brnit/ui/components/select";
import { useEffect, useState } from "react";

import type { AdminUser } from "@/lib/api/queries/admin-users";

/**
 * Sets `user.role`, the **app** role axis.
 *
 * The four options come from `APP_ROLES` rather than a local list, so the
 * dialog cannot offer a role the rest of the app does not recognise. The
 * organization axis (`member.role`) is a different question answered on the
 * organization screens — the two are orthogonal, not a hierarchy.
 */

const ROLE_LABEL: Record<AppRole, string> = {
	admin: "Admin",
	nutritionist: "Nutritionist",
	coach: "Coach",
	user: "User",
};

const DEFAULT_ROLE: AppRole = "user";

interface ChangeUserRoleDialogProps {
	isSaving: boolean;
	onConfirm: (role: string) => void;
	onOpenChange: (open: boolean) => void;
	open: boolean;
	/** `null` while the dialog is closed. */
	user: AdminUser | null;
}

export function ChangeUserRoleDialog({
	isSaving,
	onConfirm,
	onOpenChange,
	open,
	user,
}: Readonly<ChangeUserRoleDialogProps>) {
	const [role, setRole] = useState<string>(DEFAULT_ROLE);

	// Reseeds on open so reopening on a different person never shows the
	// previous selection.
	useEffect(() => {
		if (open) {
			setRole(user?.role ?? DEFAULT_ROLE);
		}
	}, [open, user]);

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Change role</DialogTitle>
					<DialogDescription>
						Set the app role for {user?.name || user?.email || "this user"}.
					</DialogDescription>
				</DialogHeader>

				<FormField htmlFor="change-user-role" label="Role">
					<Select
						disabled={isSaving}
						onValueChange={(value: string | null) => {
							if (value !== null) {
								setRole(value);
							}
						}}
						value={role}
					>
						<SelectTrigger id="change-user-role">
							<SelectValue placeholder="Select a role" />
						</SelectTrigger>
						<SelectContent>
							{APP_ROLES.map((appRole) => (
								<SelectItem key={appRole} value={appRole}>
									{ROLE_LABEL[appRole]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</FormField>

				<DialogFooter>
					<Button
						disabled={isSaving}
						onClick={() => onOpenChange(false)}
						variant="outline"
					>
						Cancel
					</Button>
					<Button disabled={isSaving} onClick={() => onConfirm(role)}>
						{isSaving ? "Saving…" : "Save role"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
