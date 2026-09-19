import type { ReactNode } from "react";

import { useRealtimeSocket } from "@/hooks/use-realtime-socket";

/**
 * Holds the realtime socket open for the whole app.
 *
 * Must be mounted **inside** `QueryClientProvider`: the socket's entire job is
 * to invalidate React Query keys, so the hook needs a client in context. It
 * renders nothing of its own and gates itself on the session, which is why it
 * can safely wrap the signed-out routes too.
 */
export function RealtimeProvider({
	children,
}: Readonly<{ children: ReactNode }>) {
	useRealtimeSocket();
	return children;
}
