import type { AppVersionResponse } from "@brnit/api";
import { type ReactNode, useEffect, useState } from "react";
import { AppState } from "react-native";

import { checkAppVersion, NO_VERSION_RESULT } from "@/lib/app/version-gate";

import { UpdateBlockedScreen } from "./update-blocked-screen";
import { showUpdateNudge } from "./update-nudge";

/**
 * Applies the server's version decision to the whole app.
 *
 * Mounted around the root navigator rather than on a single route: a gate that
 * only lives on `index` stops blocking the moment the user is anywhere else,
 * which is exactly the state a retired build is likely to restore into.
 *
 * It **fails open** in both directions. The starting state is `none`, so a cold
 * start never waits on the network to render, and a rejected check leaves the
 * last known decision untouched — a server that is down or unreachable can
 * never brick the app. Note the asymmetry: a failed check does not *clear* a
 * standing block either, so going offline is not a way out of one.
 */
export function VersionGateProvider({ children }: { children: ReactNode }) {
	const [result, setResult] = useState<AppVersionResponse>(NO_VERSION_RESULT);

	useEffect(() => {
		let active = true;

		function runCheck() {
			checkAppVersion()
				.then((next) => {
					if (!active) {
						return;
					}
					setResult(next);
					if (next.action === "nudge") {
						// Throttled inside `showUpdateNudge`; blocking above is not.
						showUpdateNudge(next);
					}
				})
				.catch((error: unknown) => {
					console.error("[VersionGate] Check failed:", error);
				});
		}

		// Cold start, then again on every return to the foreground — a build can
		// be retired while the app sits backgrounded for days.
		runCheck();
		const subscription = AppState.addEventListener("change", (state) => {
			if (state === "active") {
				runCheck();
			}
		});

		return () => {
			active = false;
			subscription.remove();
		};
	}, []);

	if (result.action === "block") {
		return (
			<UpdateBlockedScreen
				message={result.message}
				storeUrl={result.storeUrl}
			/>
		);
	}

	return <>{children}</>;
}
