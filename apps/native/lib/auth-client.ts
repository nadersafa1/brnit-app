import { expoClient } from "@better-auth/expo/client";
import { env } from "@burn-app/env/native";
import { adminClient, organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { ac, owner, admin, member } from "@burn-app/auth/permissions";

export const authClient = createAuthClient({
  baseURL: env.EXPO_PUBLIC_SERVER_URL,
  plugins: [
    adminClient(),
    organizationClient({ ac, roles: { owner, admin, member } }),
    expoClient({
      scheme: Constants.expoConfig?.scheme as string,
      storagePrefix: Constants.expoConfig?.scheme as string,
      storage: SecureStore,
    }),
  ],
});
