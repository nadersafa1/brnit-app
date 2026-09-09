/**
 * Where every "Book a demo" on the landing page ends up.
 *
 * PLACEHOLDER: point this at the real sales inbox (or swap the `mailto:` for a
 * form route once one exists). It is deliberately the single definition on the
 * page, so changing it is a one-line edit rather than a hunt through the
 * sections.
 */
const DEMO_INBOX = "hello@brnit.app";

export const DEMO_MAILTO = `mailto:${DEMO_INBOX}?subject=${encodeURIComponent(
	"Brnit — demo request"
)}`;
