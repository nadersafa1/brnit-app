import type { ReactNode } from "react";

import { useRealtimeSocket } from "@/hooks/use-realtime-socket";

/**
 * Mounts the app's socket for the subtree below it.
 *
 * Renders nothing of its own — it exists so the connection's lifetime is tied
 * to a layout rather than to whichever screen happens to be first to want it.
 * It belongs in the authenticated dashboard shell and nowhere above it: the
 * root route also renders the sign-in screens, and it must sit *inside* the
 * React Query provider, because the handlers invalidate through
 * `useQueryClient()`.
 */
export function RealtimeProvider({
	children,
	enabled = true,
}: Readonly<{ children: ReactNode; enabled?: boolean }>) {
	useRealtimeSocket(enabled);
	return children;
}
