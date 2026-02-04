import "dotenv/config";

export const env = {
  DATABASE_URL: process.env.DATABASE_URL || "",
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || "",
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "",
  NODE_ENV: (process.env.NODE_ENV as "development" | "production" | "test") || "development",
};
