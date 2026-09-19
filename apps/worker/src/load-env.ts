import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'

/**
 * The repo keeps one env file at `apps/web/.env` (same convention as
 * `packages/db`). Resolve it from this file rather than `process.cwd()` so the
 * worker finds it however the process was launched.
 *
 * `dotenv` never overrides variables already in the environment, so a real
 * deployment's config still wins.
 */
config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../web/.env') })
