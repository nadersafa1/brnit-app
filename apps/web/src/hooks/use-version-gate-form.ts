import type { AdminVersionGateDto, AppVersionConfigDto } from "@brnit/api";
import { appVersionConfigSchema } from "@brnit/api/version-gate/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useSaveVersionGateMutation } from "@/hooks/use-version-gate-mutations";

/**
 * The **server's own** per-platform schema, once for each platform.
 *
 * Reusing it is what keeps the `latestVersion < minVersion` rejection honest:
 * `appVersionConfigSchema` runs `isVersionBelow` from `@brnit/domain` in its
 * `superRefine`, so the browser rejects exactly what the server would, by
 * exactly the same comparison, with exactly the same sentence — one algorithm
 * and one schema rather than a client-side paraphrase of either.
 *
 * `AdminVersionGatePutBody` has both platforms optional (an omitted one is left
 * untouched). The form requires both, because the screen edits both at once and
 * a half-filled platform is a configuration nobody asked for.
 */
const versionGateFormSchema = z.object({
	android: appVersionConfigSchema,
	ios: appVersionConfigSchema,
});

export type VersionGateFormInput = z.input<typeof versionGateFormSchema>;
export type VersionGateFormOutput = z.output<typeof versionGateFormSchema>;

type Platform = "android" | "ios";
type VersionField = "latestVersion" | "minVersion";

/** `null` is "no row" — the gate is off for that platform, so the fields start blank. */
function configOrEmpty(
	config: AppVersionConfigDto | null
): AppVersionConfigDto {
	return {
		latestVersion: config?.latestVersion ?? "",
		message: config?.message ?? "",
		minVersion: config?.minVersion ?? "",
		storeUrl: config?.storeUrl ?? "",
	};
}

function defaultValuesFor(gate: AdminVersionGateDto): VersionGateFormInput {
	return {
		android: configOrEmpty(gate.android),
		ios: configOrEmpty(gate.ios),
	};
}

interface UseVersionGateFormOptions {
	/** The stored gate, already loaded — the form seeds from it once, on mount. */
	gate: AdminVersionGateDto;
}

/**
 * Owns schema, form, mutation and submit. The page that renders it is layout
 * only.
 *
 * Saving sends **both** platforms: they share one screen and one button, and
 * sending only the dirty half would leave the other one's on-screen values
 * unexplained if the save later succeeded.
 */
export function useVersionGateForm({ gate }: UseVersionGateFormOptions) {
	const saveMutation = useSaveVersionGateMutation();

	const form = useForm<VersionGateFormInput, unknown, VersionGateFormOutput>({
		defaultValues: defaultValuesFor(gate),
		mode: "onBlur",
		resolver: zodResolver(versionGateFormSchema),
	});

	const { isDirty, isValid } = form.formState;

	/**
	 * `register` for one of the two version fields, which are validated as a
	 * **pair** but report their issue on `minVersion` alone.
	 *
	 * React Hook Form only refreshes the errors of the field that was just
	 * blurred, so on its own a corrected `latestVersion` would leave the message
	 * standing under a `minVersion` that is now fine — and a newly *broken*
	 * `latestVersion` would disable Save while showing nothing to explain why.
	 * Revalidating both on either blur is what keeps the message and the button
	 * telling the same story.
	 */
	const registerVersionField = (platform: Platform, field: VersionField) => {
		const registered = form.register(`${platform}.${field}`);
		return {
			...registered,
			onBlur: async (event: Parameters<typeof registered.onBlur>[0]) => {
				await registered.onBlur(event);
				await form.trigger([
					`${platform}.latestVersion`,
					`${platform}.minVersion`,
				]);
			},
		};
	};

	const onSubmit = form.handleSubmit(async (values) => {
		try {
			const saved = await saveMutation.mutateAsync(values);
			// Re-seeding from the response is what clears `isDirty`, so the button
			// goes back to disabled instead of offering to save what was just saved.
			form.reset(defaultValuesFor(saved));
		} catch {
			// Reported by the mutation's own `onError`; the entered values stay on
			// screen so nothing typed is thrown away.
		}
	});

	return {
		/** Valid **and** changed **and** not already in flight. */
		canSave: isValid && isDirty && !saveMutation.isPending,
		form,
		isSaving: saveMutation.isPending,
		onSubmit,
		registerVersionField,
	};
}
