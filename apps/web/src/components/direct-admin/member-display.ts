import type { OrganizationMemberRow } from "@/hooks/use-assessment-members";

const UNNAMED_MEMBER = "this member";

/**
 * The name to address a member by. `user.name` is optional at sign-up (an OAuth
 * profile may carry none), so the email is the fallback before a placeholder.
 */
export function memberDisplayName(member: OrganizationMemberRow): string {
	return member.user.name?.trim() || member.user.email || UNNAMED_MEMBER;
}
