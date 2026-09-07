/** App scheme for deep links (must match app.json scheme) */
export const APP_SCHEME = "brnit";

/** Base URL for deep links */
export const DEEP_LINK_BASE = `${APP_SCHEME}://`;

/** Auth deep links used by better-auth redirectTo/callbackURL */
export const DEEP_LINKS = {
	/** After email verification */
	root: `${DEEP_LINK_BASE}`,
	/** Password reset page - includes ?token=xxx when used */
	resetPassword: `${DEEP_LINK_BASE}reset-password`,
	/** Organization invitation: use ?invitationId=xxx (same as web /accept-invitation) */
	acceptInvitation: `${DEEP_LINK_BASE}accept-invitation`,
} as const;
