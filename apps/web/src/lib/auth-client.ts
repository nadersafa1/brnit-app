import { adminClient, organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { ac, owner, admin, member } from "@burn-app/auth/permissions";

export const authClient = createAuthClient({
  plugins: [
    adminClient(),
    organizationClient({ ac, roles: { owner, admin, member } }),
  ],
});
