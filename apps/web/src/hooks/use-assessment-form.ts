import type { AssessmentDto } from "@brnit/api";
import { createAssessmentInputSchema } from "@brnit/api/assessment/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import type { FormEventHandler } from "react";
import { useState } from "react";
import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
	assessedAtInputToIso,
	isoToAssessedAtInput,
	nowAssessedAtInput,
} from "@/components/direct-admin/assessment-datetime";
import {
	ASSESSMENT_METRIC_BOUNDS,
	type AssessmentMetricName,
} from "@/components/direct-admin/assessment-metrics";
import {
	getAssessmentWriteErrorMessage,
	useCreateAssessmentMutation,
	useUpdateAssessmentMutation,
} from "@/hooks/use-assessment-mutations";
import { useAuthFormServerError } from "@/hooks/use-auth-form-server-error";
import type {
	AssessmentImageOptions,
	UpdateAssessmentFields,
} from "@/lib/api/queries/assessments";

/**
 * The assessment form — schema, react-hook-form instance, image state, mutation
 * and submit. The `.tsx` that renders it is layout only.
 *
 * Create and update are **separate** hooks because the two endpoints disagree
 * about what a blank field means, and that difference is the whole point:
 *
 * - Create requires all seven metrics. A blank field used to arrive as `""`,
 *   coerce to `0` and be stored as a real measurement; the API rejects that with
 *   a 400 now, so the form has to reject it first, with a message on the field.
 * - Update takes any subset, and a blank field means "leave this metric alone".
 *   It must never be sent as `""` — that is the same silent zeroing, one layer
 *   down.
 *
 * Both build their fields from `createAssessmentInputSchema`, so the ranges the
 * controls clamp to and the messages the resolver produces are the server's own.
 */

const REQUIRED_MESSAGE = "Required";
const ASSESSED_AT_REQUIRED_MESSAGE = "Enter when the assessment was taken";
const NOTHING_TO_UPDATE_MESSAGE =
	"Change at least one value, replace the image, or remove it.";
const CREATE_FAILED_MESSAGE = "Could not add the assessment";
const UPDATE_FAILED_MESSAGE = "Could not update the assessment";

/**
 * The control is a `datetime-local`, the column is an instant — so the local
 * value is converted before the server's own `z.iso.datetime()` sees it.
 */
const assessedAtField = z
	.string()
	.trim()
	.min(1, ASSESSED_AT_REQUIRED_MESSAGE)
	.transform(assessedAtInputToIso)
	.pipe(createAssessmentInputSchema.shape.assessedAt);

const optionalAssessedAtField = z
	.string()
	.trim()
	.transform((value) =>
		value === "" ? undefined : assessedAtInputToIso(value)
	)
	.pipe(createAssessmentInputSchema.shape.assessedAt.optional());

/** Every control is a text input, so every value arrives as a string. */
function requiredMetricField(name: AssessmentMetricName) {
	const { max, min } = ASSESSMENT_METRIC_BOUNDS[name];
	return z
		.string()
		.trim()
		.min(1, REQUIRED_MESSAGE)
		.transform(Number)
		.pipe(z.number().min(min).max(max));
}

/** Blank means "not sent". Never `0`, and never `""` on the wire. */
function optionalMetricField(name: AssessmentMetricName) {
	const { max, min } = ASSESSMENT_METRIC_BOUNDS[name];
	return z
		.string()
		.transform((value) => (value.trim() === "" ? undefined : Number(value)))
		.pipe(z.number().min(min).max(max).optional());
}

/**
 * Exported so the blank-field contract can be asserted directly: it is the one
 * rule where a wrong answer is silent (a stored `0` that looks like a real
 * measurement) rather than an error.
 */
export const createAssessmentFormSchema = z.object({
	assessedAt: assessedAtField,
	bmi: requiredMetricField("bmi"),
	bodyFatPercent: requiredMetricField("bodyFatPercent"),
	bodyWaterL: requiredMetricField("bodyWaterL"),
	heightCm: requiredMetricField("heightCm"),
	muscleMassKg: requiredMetricField("muscleMassKg"),
	visceralFatAreaCm2: requiredMetricField("visceralFatAreaCm2"),
	weightKg: requiredMetricField("weightKg"),
});

export const updateAssessmentFormSchema = z.object({
	assessedAt: optionalAssessedAtField,
	bmi: optionalMetricField("bmi"),
	bodyFatPercent: optionalMetricField("bodyFatPercent"),
	bodyWaterL: optionalMetricField("bodyWaterL"),
	heightCm: optionalMetricField("heightCm"),
	muscleMassKg: optionalMetricField("muscleMassKg"),
	visceralFatAreaCm2: optionalMetricField("visceralFatAreaCm2"),
	weightKg: optionalMetricField("weightKg"),
});

/** Identical for both schemas: the raw strings the controls hold. */
export type AssessmentFormValues = z.input<typeof createAssessmentFormSchema>;

/** What the layout component needs, and nothing more. */
export interface AssessmentFormBinding {
	clearImage: boolean;
	errors: FieldErrors<AssessmentFormValues>;
	isSaving: boolean;
	onSubmit: FormEventHandler<HTMLFormElement>;
	register: UseFormRegister<AssessmentFormValues>;
	selectFile: (file: File | null) => void;
	serverError: string | null;
	toggleClearImage: (next: boolean) => void;
}

function emptyAssessmentFormValues(): AssessmentFormValues {
	return {
		assessedAt: nowAssessedAtInput(),
		bmi: "",
		bodyFatPercent: "",
		bodyWaterL: "",
		heightCm: "",
		muscleMassKg: "",
		visceralFatAreaCm2: "",
		weightKg: "",
	};
}

/** Metrics come back as the `numeric` strings Drizzle read, ready to re-submit. */
function assessmentFormValues(assessment: AssessmentDto): AssessmentFormValues {
	return {
		assessedAt: isoToAssessedAtInput(assessment.assessedAt),
		bmi: assessment.bmi,
		bodyFatPercent: assessment.bodyFatPercent,
		bodyWaterL: assessment.bodyWaterL,
		heightCm: assessment.heightCm,
		muscleMassKg: assessment.muscleMassKg,
		visceralFatAreaCm2: assessment.visceralFatAreaCm2,
		weightKg: assessment.weightKg,
	};
}

/** Picking a file and clearing the image are mutually exclusive intents. */
function useAssessmentImage() {
	const [file, setFile] = useState<File | null>(null);
	const [clearImage, setClearImage] = useState(false);

	return {
		clearImage,
		file,
		reset: () => {
			setFile(null);
			setClearImage(false);
		},
		selectFile: (nextFile: File | null) => {
			setFile(nextFile);
			if (nextFile) {
				setClearImage(false);
			}
		},
		toggleClearImage: (next: boolean) => {
			setClearImage(next);
			if (next) {
				setFile(null);
			}
		},
	};
}

/** Mirrors the server's "at least one field, file or clearImage" check. */
function hasAssessmentUpdate(
	fields: UpdateAssessmentFields,
	image: AssessmentImageOptions
): boolean {
	return (
		Object.values(fields).some((value) => value !== undefined) ||
		Boolean(image.file) ||
		Boolean(image.clearImage)
	);
}

interface UseCreateAssessmentFormOptions {
	memberId: string;
	onSaved?: () => void;
}

export function useCreateAssessmentForm({
	memberId,
	onSaved,
}: UseCreateAssessmentFormOptions): AssessmentFormBinding {
	const image = useAssessmentImage();
	const { clearServerError, reportServerError, serverError } =
		useAuthFormServerError();
	const mutation = useCreateAssessmentMutation();

	const form = useForm<
		AssessmentFormValues,
		unknown,
		z.output<typeof createAssessmentFormSchema>
	>({
		defaultValues: emptyAssessmentFormValues(),
		mode: "onBlur",
		resolver: zodResolver(createAssessmentFormSchema),
	});

	const onSubmit = form.handleSubmit(async (values) => {
		clearServerError();
		try {
			// No `clearImage` on create: there is no stored image to clear yet.
			await mutation.mutateAsync({
				fields: { ...values, memberId },
				image: { file: image.file },
			});
		} catch (error) {
			reportServerError(
				getAssessmentWriteErrorMessage(error, CREATE_FAILED_MESSAGE)
			);
			return;
		}
		form.reset(emptyAssessmentFormValues());
		image.reset();
		onSaved?.();
	});

	return {
		clearImage: image.clearImage,
		errors: form.formState.errors,
		isSaving: mutation.isPending,
		onSubmit,
		register: form.register,
		selectFile: image.selectFile,
		serverError,
		toggleClearImage: image.toggleClearImage,
	};
}

interface UseUpdateAssessmentFormOptions {
	assessment: AssessmentDto;
	onSaved?: () => void;
}

export function useUpdateAssessmentForm({
	assessment,
	onSaved,
}: UseUpdateAssessmentFormOptions): AssessmentFormBinding {
	const image = useAssessmentImage();
	const { clearServerError, reportServerError, serverError } =
		useAuthFormServerError();
	const mutation = useUpdateAssessmentMutation(assessment.id);

	const form = useForm<
		AssessmentFormValues,
		unknown,
		z.output<typeof updateAssessmentFormSchema>
	>({
		defaultValues: assessmentFormValues(assessment),
		mode: "onBlur",
		resolver: zodResolver(updateAssessmentFormSchema),
	});

	const onSubmit = form.handleSubmit(async (values) => {
		clearServerError();
		const imageOptions: AssessmentImageOptions = {
			clearImage: image.clearImage,
			file: image.file,
		};
		// The API answers 400 for an empty PATCH; saying so here costs a round trip
		// less and keeps the reason next to the form.
		if (!hasAssessmentUpdate(values, imageOptions)) {
			reportServerError(NOTHING_TO_UPDATE_MESSAGE);
			return;
		}
		try {
			await mutation.mutateAsync({ fields: values, image: imageOptions });
		} catch (error) {
			reportServerError(
				getAssessmentWriteErrorMessage(error, UPDATE_FAILED_MESSAGE)
			);
			return;
		}
		image.reset();
		onSaved?.();
	});

	return {
		clearImage: image.clearImage,
		errors: form.formState.errors,
		isSaving: mutation.isPending,
		onSubmit,
		register: form.register,
		selectFile: image.selectFile,
		serverError,
		toggleClearImage: image.toggleClearImage,
	};
}
