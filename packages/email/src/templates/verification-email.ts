import { sendEmail } from '../send-email'

export async function sendVerificationEmail({ to, url }: { to: string; url: string }) {
  await sendEmail({
    to,
    subject: 'Email Verification',
    meta: {
      description: 'Click the link below to verify your email address',
      link: url,
      linkText: 'Verify Email',
    },
  })
}
