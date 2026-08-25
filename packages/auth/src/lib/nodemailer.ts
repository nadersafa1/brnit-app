import nodemailer from "nodemailer";
import { env } from "@brnit/env/server";

const transporter = nodemailer.createTransport({
  host: env.NODEMAILER_HOST,
  port: env.NODEMAILER_PORT ?? 465,
  secure: true,
  auth: {
    user: env.NODEMAILER_USER,
    pass: env.NODEMAILER_APP_PASSWORD,
  },
});

export default transporter;
