import { config } from "dotenv";
import path from "node:path";

// Ensure server env (including NODEMAILER_*) is loaded from apps/web/.env when this route runs
config({ path: path.resolve(process.cwd(), ".env") });

import { auth } from "@burn-app/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { withRequestLogging } from '@/lib/api-helpers/with-request-logging'

const handlers = toNextJsHandler(auth.handler)

export const GET = withRequestLogging((req) => handlers.GET(req), { actionName: 'AuthGET' })
export const POST = withRequestLogging((req) => handlers.POST(req), { actionName: 'AuthPOST' })
