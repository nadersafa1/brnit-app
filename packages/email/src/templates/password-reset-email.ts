import { sendEmail } from '../send-email'

export async function sendPasswordResetEmail({ to, url }: { to: string; url: string }) {
  await sendEmail({
    to,
    subject: 'Password Reset',
    meta: {
      description: 'Click the link below to reset your password',
      link: url,
      linkText: 'Reset Password',
    },
  })
}
