/**
 * The single Brnit-branded HTML email template and the Nodemailer send.
 *
 * Colours come from `@brnit/brand`'s `brandEmail` palette — a flat, light-only
 * set, because email clients support neither CSS custom properties nor a theme
 * toggle. Everything is inline `style` attributes for the same reason.
 */
import { BRAND_DISPLAY_NAME, brandEmail } from "@brnit/brand/tokens";
import { env } from "@brnit/env/server";
import { getLogger } from "@brnit/logger";

import transporter from "./lib/nodemailer";

const TRAILING_SLASHES = /\/+$/;
const HTML_ESCAPES: Record<string, string> = {
	'"': "&quot;",
	"&": "&amp;",
	"'": "&#39;",
	"<": "&lt;",
	">": "&gt;",
};
const HTML_UNSAFE = /["&'<>]/g;

const EMAIL_NOT_CONFIGURED = `[${BRAND_DISPLAY_NAME}] Email is not configured. Set NODEMAILER_HOST, NODEMAILER_USER, and NODEMAILER_APP_PASSWORD in the server environment.`;

/**
 * Escapes text interpolated into the template. Organization and inviter names
 * reach the invitation email verbatim, so they must not be able to inject
 * markup.
 */
function escapeHtml(value: string): string {
	return value.replace(HTML_UNSAFE, (char) => HTML_ESCAPES[char] ?? char);
}

/**
 * Origin of the **web app**, not of the API.
 *
 * Every link in an email (verification landing, reset form, invitation accept,
 * the logo, the footer) is a page the Vite SPA serves. Since the overhaul the
 * API lives on its own origin and serves no static assets, so `BETTER_AUTH_URL`
 * is only a last-resort fallback for a misconfigured deployment.
 */
export function resolveWebAppOrigin(): string {
	const configured = env.CORS_ORIGIN[0];
	if (configured) {
		return configured.replace(TRAILING_SLASHES, "");
	}
	return new URL(env.BETTER_AUTH_URL).origin;
}

/** True when all three SMTP settings are present. */
export function isEmailConfigured(): boolean {
	return Boolean(
		env.NODEMAILER_HOST && env.NODEMAILER_USER && env.NODEMAILER_APP_PASSWORD
	);
}

const emailStyles = {
	button: `display: inline-block; padding: 14px 28px; background-color: ${brandEmail.accent}; color: ${brandEmail.onAccent}; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;`,
	buttonContainer: "text-align: center; margin: 28px 0;",
	container: `max-width: 600px; margin: 0 auto; background-color: ${brandEmail.background}; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);`,
	content: "padding: 40px;",
	footer: `padding: 24px 40px; background-color: ${brandEmail.wrapperBg}; border-top: 1px solid ${brandEmail.border}; text-align: center;`,
	footerLink: `color: ${brandEmail.accentFg}; text-decoration: none; font-weight: 500;`,
	footerText: `font-size: 12px; color: ${brandEmail.textMuted}; margin: 0; line-height: 1.5;`,
	header: `padding: 32px 40px 28px; text-align: center; background-color: ${brandEmail.background}; border-bottom: 1px solid ${brandEmail.border};`,
	heading: `font-size: 22px; font-weight: 600; color: ${brandEmail.text}; margin: 0 0 12px 0; line-height: 1.35;`,
	logoImg:
		"display: block; margin: 0 auto; height: 36px; width: auto; max-width: 140px; border: 0; outline: none;",
	paragraph: `font-size: 15px; color: ${brandEmail.text}; margin: 0 0 28px 0; line-height: 1.6;`,
	wrapper: `font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: ${brandEmail.wrapperBg}; padding: 40px 20px; line-height: 1.6; color: ${brandEmail.text};`,
} as const;

export interface EmailMeta {
	description: string;
	link?: string;
	linkText?: string;
}

export interface SendEmailParams {
	meta: EmailMeta;
	subject: string;
	to: string;
}

function buildEmailHtml(
	subject: string,
	meta: EmailMeta,
	webAppOrigin: string
): string {
	const safeSubject = escapeHtml(subject);
	const cta = meta.link
		? `
          <div style="${emailStyles.buttonContainer}">
            <a href="${escapeHtml(meta.link)}" style="${emailStyles.button}">
              ${escapeHtml(meta.linkText ?? "Get Started")}
            </a>
          </div>
          `
		: "";

	return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${BRAND_DISPLAY_NAME} - ${safeSubject}</title>
    </head>
    <body style="${emailStyles.wrapper}">
      <div style="${emailStyles.container}">
        <div style="${emailStyles.header}">
          <img src="${webAppOrigin}/Brnit-Logo.png" alt="${BRAND_DISPLAY_NAME}" style="${emailStyles.logoImg}" width="112" height="36" />
        </div>
        <div style="${emailStyles.content}">
          <h2 style="${emailStyles.heading}">${safeSubject}</h2>
          <p style="${emailStyles.paragraph}">${escapeHtml(meta.description)}</p>
          ${cta}
        </div>
        <div style="${emailStyles.footer}">
          <p style="${emailStyles.footerText}">
            This email was sent by ${BRAND_DISPLAY_NAME}.<br>
            <a href="${webAppOrigin}" style="${emailStyles.footerLink}">Visit our website</a>
          </p>
        </div>
      </div>
    </body>
    </html>
    `;
}

/**
 * Sends one branded email. Throws when SMTP is unconfigured — every caller is a
 * Better Auth flow that must fail loudly rather than silently drop a
 * verification or reset link.
 */
export async function sendEmail({
	to,
	subject,
	meta,
}: SendEmailParams): Promise<{ success: boolean }> {
	const log = getLogger();

	if (!isEmailConfigured()) {
		log.error(EMAIL_NOT_CONFIGURED);
		throw new Error("Email is not configured. Please contact support.");
	}

	const mailOptions = {
		from: env.NODEMAILER_USER,
		html: buildEmailHtml(subject, meta, resolveWebAppOrigin()),
		subject: `${BRAND_DISPLAY_NAME} - ${subject}`,
		to,
	};

	try {
		await transporter.sendMail(mailOptions);
	} catch (err) {
		log.error({ err }, "transactional email send failed");
		throw err;
	}

	return { success: true };
}
