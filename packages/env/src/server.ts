import 'dotenv/config'

export const env = {
  DATABASE_URL: process.env.DATABASE_URL || '',
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || '',
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || '',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '',
  NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
  NODEMAILER_HOST: process.env.NODEMAILER_HOST || '',
  NODEMAILER_USER: process.env.NODEMAILER_USER || '',
  NODEMAILER_APP_PASSWORD: process.env.NODEMAILER_APP_PASSWORD || '',
  NODEMAILER_PORT: process.env.NODEMAILER_PORT ? Number(process.env.NODEMAILER_PORT) : 465,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  /** Sign in with Apple (Service ID); use with JWT client secret from .p8 key */
  APPLE_CLIENT_ID: process.env.APPLE_CLIENT_ID || '',
  APPLE_TEAM_ID: process.env.APPLE_TEAM_ID || '',
  APPLE_KEY_ID: process.env.APPLE_KEY_ID || '',
  /** PEM contents; use \\n in .env for newlines */
  APPLE_PRIVATE_KEY: process.env.APPLE_PRIVATE_KEY || '',
  /** Native iOS idToken flows; optional for web OAuth */
  APPLE_APP_BUNDLE_IDENTIFIER: process.env.APPLE_APP_BUNDLE_IDENTIFIER || '',

  /**
   * Redis connection for BullMQ. Empty in local development runs jobs inline
   * (see packages/queue); required in production or the worker refuses to start.
   */
  REDIS_URL: process.env.REDIS_URL || '',
  /** Jobs a single worker processes in parallel. */
  WORKER_CONCURRENCY: process.env.WORKER_CONCURRENCY ? Number(process.env.WORKER_CONCURRENCY) : 5,
  /** Minimum level emitted by the queue/worker logger. */
  LOG_LEVEL: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
  /** Days of `audit_log` rows the retention job keeps. */
  AUDIT_LOG_RETENTION_DAYS: process.env.AUDIT_LOG_RETENTION_DAYS ? Number(process.env.AUDIT_LOG_RETENTION_DAYS) : 90,
}
