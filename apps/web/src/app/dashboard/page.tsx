import { auth } from "@brnit/auth";
import { headers } from "next/headers";

import { WelcomeCard } from "./welcome-card";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const user = session!.user!;

  return <WelcomeCard user={user} />;
}
