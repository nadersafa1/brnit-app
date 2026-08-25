import { env } from "@brnit/env/server";
import nodemailer from "nodemailer";

/**
 * SMTP transport for the three transactional flows (verification, password
 * reset, organization invitation).
 *
 * `secure: true` is deliberate and matches the documented contract: the
 * configured account speaks implicit TLS on 465. `NODEMAILER_PORT` defaults to
 * 465 in `@brnit/env/server`.
 *
 * Created at module load even when SMTP is unconfigured — nodemailer does not
 * connect until `sendMail`, and `sendEmail` refuses before ever reaching it.
 */
const transporter = nodemailer.createTransport({
	auth: {
		pass: env.NODEMAILER_APP_PASSWORD,
		user: env.NODEMAILER_USER,
	},
	host: env.NODEMAILER_HOST,
	port: env.NODEMAILER_PORT,
	secure: true,
});

export default transporter;
