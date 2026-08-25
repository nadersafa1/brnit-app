import type {
	DietPlanAssignmentWithMealTimesDto,
	DietPlanMealDto,
} from "@brnit/api";
import {
	addDaysUTC,
	getTodayUtcDateString,
	isUtcDateString,
} from "@brnit/datetime";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useAuthFormServerError } from "@/hooks/use-auth-form-server-error";
import {
	useCreateDietPlanAssignmentMutation,
	useUpdateDietPlanAssignmentMutation,
} from "@/hooks/use-organization-assignment-mutations";
import {
	buildMealTimeOverridesPayload,
	mealTimeFieldMapFromPlanAndOverrides,
} from "@/lib/api/queries/organization-diet-plan-assignments";
import {
	dietPlanDetailQueryOptions,
	dietPlanPickerQueryOptions,
} from "@/lib/api/queries/organization-diet-plans";
import { getUserFacingErrorMessage } from "@/lib/get-error-message";

/** The window a new assignment defaults to, matching the pre-overhaul dialog. */
const DEFAULT_ASSIGNMENT_DAYS = 30;

const NO_MEALS: readonly DietPlanMealDto[] = [];

/**
 * Dates are `'YYYY-MM-DD'` strings end to end — the column type, the wire type
 * and the `<input type="date">` value are all the same string, so nothing here
 * ever constructs a `Date`.
 */
const utcDateSchema = z
	.string()
	.refine(isUtcDateString, "Enter a date as YYYY-MM-DD");

const assignmentFormSchema = z
	.object({
		dietPlanId: z.string().min(1, "Select a diet plan"),
		endDate: utcDateSchema,
		startDate: utcDateSchema,
	})
	.refine((values) => values.startDate <= values.endDate, {
		message: "The end date must be on or after the start date",
		path: ["endDate"],
	});

export type AssignmentFormValues = z.infer<typeof assignmentFormSchema>;

interface UseOrganizationAssignmentFormOptions {
	/** Present when editing; the plan itself cannot be changed after assignment. */
	assignment?: DietPlanAssignmentWithMealTimesDto | null;
	memberId: string;
	onSaved?: () => void;
	/** Preselects a plan that was just created from this screen. */
	preselectedDietPlanId?: string;
}

function defaultValuesFor(
	assignment: DietPlanAssignmentWithMealTimesDto | null | undefined,
	preselectedDietPlanId: string | undefined
): AssignmentFormValues {
	if (assignment) {
		return {
			dietPlanId: assignment.dietPlanId,
			endDate: assignment.endDate,
			startDate: assignment.startDate,
		};
	}
	const today = getTodayUtcDateString();
	return {
		dietPlanId: preselectedDietPlanId ?? "",
		endDate: addDaysUTC(today, DEFAULT_ASSIGNMENT_DAYS),
		startDate: today,
	};
}

/**
 * The assign-a-plan form, in both the create and the edit shape.
 *
 * The per-meal times are **not** form fields: they are one value per slot of
 * whichever plan is selected, so they live as local state keyed by
 * `dietPlanMealId` and are seeded from the plan (and, when editing, from the
 * assignment's existing overrides) as soon as the plan detail loads. Only the
 * ones that differ from the plan default are sent — an emptied field is
 * `scheduledTime: null`, which clears the override rather than meaning "leave
 * it alone".
 *
 * Overlap is not checked here. The server owns that rule, org-wide, and answers
 * 409 with a message naming the conflict; it is surfaced in the banner.
 */
export function useOrganizationAssignmentForm({
	assignment,
	memberId,
	onSaved,
	preselectedDietPlanId,
}: UseOrganizationAssignmentFormOptions) {
	const isEdit = Boolean(assignment);
	const createMutation = useCreateDietPlanAssignmentMutation();
	const updateMutation = useUpdateDietPlanAssignmentMutation(
		assignment?.id ?? ""
	);
	const { clearServerError, reportServerError, serverError } =
		useAuthFormServerError();

	const form = useForm<AssignmentFormValues>({
		defaultValues: defaultValuesFor(assignment, preselectedDietPlanId),
		mode: "onBlur",
		resolver: zodResolver(assignmentFormSchema),
	});

	const dietPlanId = form.watch("dietPlanId");
	const plansQuery = useQuery(dietPlanPickerQueryOptions());
	const planQuery = useQuery(dietPlanDetailQueryOptions(dietPlanId));

	const [mealTimes, setMealTimes] = useState<Record<string, string>>({});
	const seededPlanId = useRef<string | null>(null);

	const planMeals = planQuery.data?.dietPlanMeals ?? NO_MEALS;

	// Seeds the time fields once per selected plan. The guard is what lets the
	// list refetch underneath without discarding what the user has typed.
	useEffect(() => {
		const plan = planQuery.data;
		if (!plan || seededPlanId.current === plan.id) {
			return;
		}
		seededPlanId.current = plan.id;
		setMealTimes(
			mealTimeFieldMapFromPlanAndOverrides(
				plan.dietPlanMeals,
				assignment?.mealTimeOverrides ?? []
			)
		);
	}, [assignment, planQuery.data]);

	const selectDietPlan = (nextDietPlanId: string | null) => {
		if (nextDietPlanId === null) {
			return;
		}
		form.setValue("dietPlanId", nextDietPlanId, { shouldValidate: true });
	};

	const setMealTime = (dietPlanMealId: string, value: string) => {
		setMealTimes((current) => ({ ...current, [dietPlanMealId]: value }));
	};

	const onSubmit = form.handleSubmit(async (values) => {
		clearServerError();
		const mealTimeOverrides = buildMealTimeOverridesPayload(
			planMeals,
			mealTimes
		);
		try {
			if (assignment) {
				await updateMutation.mutateAsync({
					endDate: values.endDate,
					mealTimeOverrides,
					startDate: values.startDate,
				});
			} else {
				await createMutation.mutateAsync({
					dietPlanId: values.dietPlanId,
					endDate: values.endDate,
					mealTimeOverrides,
					memberId,
					startDate: values.startDate,
				});
			}
			onSaved?.();
		} catch (error) {
			// A 409 here is the overlap rule: the person already holds a plan
			// covering one of these days, in this organization or another one.
			reportServerError(
				getUserFacingErrorMessage(error, "Could not save the assignment")
			);
		}
	});

	return {
		form,
		isEdit,
		isPlanPending: dietPlanId.length > 0 && planQuery.isPending,
		isSaving: createMutation.isPending || updateMutation.isPending,
		mealTimes,
		onSubmit,
		planMeals,
		plans: plansQuery.data?.data ?? [],
		selectDietPlan,
		serverError,
		setMealTime,
	};
}
