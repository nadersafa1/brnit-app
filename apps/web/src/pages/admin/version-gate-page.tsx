import type { AdminVersionGateDto } from "@brnit/api";
import { Button } from "@brnit/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@brnit/ui/components/card";
import { FormField } from "@brnit/ui/components/form-field";
import { Input } from "@brnit/ui/components/input";
import { Skeleton } from "@brnit/ui/components/skeleton";
import { SubmitButton } from "@brnit/ui/components/submit-button";
import { Textarea } from "@brnit/ui/components/textarea";
import { useQuery } from "@tanstack/react-query";
import type { UseFormReturn } from "react-hook-form";

import { ShellPage } from "@/components/shell/shell-page";
import { ShellPageHeader } from "@/components/shell/shell-page-header";
import {
	useVersionGateForm,
	type VersionGateFormInput,
	type VersionGateFormOutput,
} from "@/hooks/use-version-gate-form";
import { adminVersionGateQueryOptions } from "@/lib/api/queries/version-gate";
import { getUserFacingErrorMessage } from "@/lib/get-error-message";

type Platform = "android" | "ios";

type VersionGateForm = UseFormReturn<
	VersionGateFormInput,
	unknown,
	VersionGateFormOutput
>;

type RegisterVersionField = ReturnType<
	typeof useVersionGateForm
>["registerVersionField"];

const PLATFORM_COPY = {
	android: {
		label: "Android",
		storeUrlPlaceholder:
			"https://play.google.com/store/apps/details?id=com.example.app",
	},
	ios: {
		label: "iOS",
		storeUrlPlaceholder: "https://apps.apple.com/app/id000000000",
	},
} as const satisfies Record<
	Platform,
	{ label: string; storeUrlPlaceholder: string }
>;

const MESSAGE_ROWS = 3;
const SKELETON_CARDS = 2;

/**
 * One platform's four fields.
 *
 * `isConfigured` is `false` when the platform had no stored row — the gate is
 * **off** for it. The fields are simply blank; the only thing that changes is
 * the sentence under the title, so an unconfigured platform never reads as a
 * failed load.
 */
function PlatformCard({
	form,
	isConfigured,
	isSaving,
	platform,
	registerVersionField,
}: Readonly<{
	form: VersionGateForm;
	isConfigured: boolean;
	isSaving: boolean;
	platform: Platform;
	registerVersionField: RegisterVersionField;
}>) {
	const copy = PLATFORM_COPY[platform];
	const errors = form.formState.errors[platform];
	const idPrefix = `version-gate-${platform}`;

	return (
		<Card>
			<CardHeader>
				<CardTitle>{copy.label}</CardTitle>
				<CardDescription>
					{isConfigured
						? `Applies to every ${copy.label} build that checks in.`
						: `No gate is stored for ${copy.label} yet — fill this in to turn it on.`}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-5">
				<div className="grid gap-5 sm:grid-cols-2">
					<FormField
						error={errors?.minVersion}
						htmlFor={`${idPrefix}-min-version`}
						label="Minimum version"
					>
						<Input
							{...registerVersionField(platform, "minVersion")}
							disabled={isSaving}
							id={`${idPrefix}-min-version`}
							inputMode="decimal"
							placeholder="1.0.0"
						/>
					</FormField>

					<FormField
						error={errors?.latestVersion}
						htmlFor={`${idPrefix}-latest-version`}
						label="Latest version"
					>
						<Input
							{...registerVersionField(platform, "latestVersion")}
							disabled={isSaving}
							id={`${idPrefix}-latest-version`}
							inputMode="decimal"
							placeholder="1.2.0"
						/>
					</FormField>
				</div>

				<FormField
					error={errors?.message}
					htmlFor={`${idPrefix}-message`}
					label="Update message"
				>
					<Textarea
						{...form.register(`${platform}.message`)}
						disabled={isSaving}
						id={`${idPrefix}-message`}
						placeholder="Shown to anyone who is blocked or nudged. Say what changed and why to update."
						rows={MESSAGE_ROWS}
					/>
				</FormField>

				<FormField
					error={errors?.storeUrl}
					htmlFor={`${idPrefix}-store-url`}
					label="Store URL"
				>
					<Input
						{...form.register(`${platform}.storeUrl`)}
						disabled={isSaving}
						id={`${idPrefix}-store-url`}
						inputMode="url"
						placeholder={copy.storeUrlPlaceholder}
						type="url"
					/>
				</FormField>
			</CardContent>
		</Card>
	);
}

/** Layout only — schema, mutation and `onSubmit` live in `useVersionGateForm`. */
function VersionGateForm({ gate }: Readonly<{ gate: AdminVersionGateDto }>) {
	const { canSave, form, isSaving, onSubmit, registerVersionField } =
		useVersionGateForm({ gate });

	return (
		<form className="space-y-6" noValidate onSubmit={onSubmit}>
			<div className="grid gap-6 lg:grid-cols-2">
				<PlatformCard
					form={form}
					isConfigured={gate.ios !== null}
					isSaving={isSaving}
					platform="ios"
					registerVersionField={registerVersionField}
				/>
				<PlatformCard
					form={form}
					isConfigured={gate.android !== null}
					isSaving={isSaving}
					platform="android"
					registerVersionField={registerVersionField}
				/>
			</div>

			<div className="flex justify-end">
				<SubmitButton
					disabled={!canSave}
					idleLabel="Save version gate"
					isSubmitting={isSaving}
					pendingLabel="Saving…"
				/>
			</div>
		</form>
	);
}

/**
 * The app version gate: what the native app is told to do when it checks in.
 *
 * Both platforms are edited on one screen and saved by one button, because the
 * pair is almost always changed together — a release that raises the iOS
 * minimum usually raises Android's in the same breath.
 *
 * The read is app-admin only and `requireAdmin` answers **401** to a signed-in
 * non-admin. That is rendered as the inline error below like any other refusal;
 * it is deliberately *not* treated as "your session ended", because it is not.
 */
export function AdminVersionGatePage() {
	const gateQuery = useQuery(adminVersionGateQueryOptions());

	const header = (
		<ShellPageHeader
			description="What the mobile app is told when it checks in. Below the minimum version it blocks; below the latest it nudges. Both platforms are saved together."
			eyebrow="Admin"
			title="App version gate"
		/>
	);

	if (gateQuery.isPending) {
		return (
			<ShellPage>
				{header}
				<div className="grid gap-6 lg:grid-cols-2">
					{Array.from({ length: SKELETON_CARDS }, (_, index) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: fixed-length placeholder cards have no identity
						<Skeleton className="h-96 w-full" key={`skeleton-${index}`} />
					))}
				</div>
			</ShellPage>
		);
	}

	if (gateQuery.isError || !gateQuery.data) {
		return (
			<ShellPage>
				{header}
				<Card className="border border-destructive/40">
					<CardContent className="space-y-3">
						<p className="text-destructive text-sm" role="alert">
							{getUserFacingErrorMessage(
								gateQuery.error,
								"The version gate could not be loaded."
							)}
						</p>
						<Button
							onClick={() => gateQuery.refetch()}
							size="sm"
							variant="outline"
						>
							Try again
						</Button>
					</CardContent>
				</Card>
			</ShellPage>
		);
	}

	return (
		<ShellPage>
			{header}
			<VersionGateForm gate={gateQuery.data} />
		</ShellPage>
	);
}
