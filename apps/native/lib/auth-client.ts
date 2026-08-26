import { expoClient } from "@better-auth/expo/client";
import {
	ac,
	client_admin,
	coach,
	direct_admin,
	member,
	nutritionist,
	owner,
} from "@brnit/auth/permissions";
import { env } from "@brnit/env/native";
import {
	adminClient,
	inferAdditionalFields,
	organizationClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import Constants from "expo-constants";
// biome-ignore lint/performance/noNamespaceImport: expoClient expects the whole SecureStore module as `storage`.
import * as SecureStore from "expo-secure-store";

/**
 * The native Better Auth client (1.5.5).
 *
 * Three things are load-bearing:
 *
 * - `baseURL` is the bare server origin. Better Auth lives at the **unversioned**
 *   `/api/auth/*` and is deliberately outside the `/api/v1` remount, so this must
 *   not carry a version prefix — `apiFetch` adds one, `authClient` does not.
 * - `ac` and the six role objects come from `@brnit/auth/permissions`, the same
 *   module the server configures `organization({ ac, roles })` with. The two sides
 *   must agree on the statement sets exactly.
 * - `inferAdditionalFields` restates `user.dob` (`type: "date"`, optional), the
 *   only additional field on the server. The generic `inferAdditionalFields<typeof
 *   auth>()` form is not usable here: it would pull the server auth instance, and
 *   Drizzle with it, into the Metro bundle.
 *
 * `admin()` is configured server-side with only a `defaultRole`, so `adminClient()`
 * takes no access controller — app roles are plain strings.
 */
const authClient = createAuthClient({
	baseURL: env.EXPO_PUBLIC_SERVER_URL,
	plugins: [
		adminClient(),
		organizationClient({
			ac,
			roles: {
				client_admin,
				coach,
				direct_admin,
				member,
				nutritionist,
				owner,
			},
		}),
		inferAdditionalFields({
			user: {
				dob: {
					required: false,
					type: "date",
				},
			},
		}),
		expoClient({
			scheme: Constants.expoConfig?.scheme as string,
			storagePrefix: Constants.expoConfig?.scheme as string,
			storage: SecureStore,
		}),
	],
});

export type NativeAuthClient = typeof authClient;

export { authClient };
