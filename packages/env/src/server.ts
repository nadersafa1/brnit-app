import "dotenv/config";

export const env = {
  DATABASE_URL: process.env.DATABASE_URL || "",
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || "",
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "",
  NODE_ENV: (process.env.NODE_ENV as "development" | "production" | "test") || "development",
  NODEMAILER_HOST: process.env.NODEMAILER_HOST || "",
  NODEMAILER_USER: process.env.NODEMAILER_USER || "",
  NODEMAILER_APP_PASSWORD: process.env.NODEMAILER_APP_PASSWORD || "",
  NODEMAILER_PORT: process.env.NODEMAILER_PORT ? Number(process.env.NODEMAILER_PORT) : 465,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
};
