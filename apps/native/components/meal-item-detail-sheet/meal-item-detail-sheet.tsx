import type { FoodItemAlternativeDto } from "@brnit/api";
import type { BottomSheetFooterProps } from "@gorhom/bottom-sheet";
import { useCallback, useRef, useState } from "react";
import {
	AppBottomSheet,
	type AppBottomSheetRef,
} from "@/components/bottom-sheet/app-bottom-sheet";
import { SheetFooter } from "@/components/bottom-sheet/sheet-footer";
import { useMealItemAlternatives } from "@/hooks/use-meal-item-alternatives";
import { useMealItemDetailOverrideActions } from "@/hooks/use-meal-item-detail-override-actions";
import { useMealItemDetailSheetVisibility } from "@/hooks/use-meal-item-detail-sheet-visibility";

import { MealItemDetailActions } from "./meal-item-detail-actions";
import { MealItemDetailContent } from "./meal-item-detail-content";
import type { MealItemDetailSheetProps } from "./types";

export function MealItemDetailSheet({
	payload,
	onClose,
}: Readonly<MealItemDetailSheetProps>) {
	const ref = useRef<AppBottomSheetRef>(null);
	const [selectedAlternative, setSelectedAlternative] =
		useState<FoodItemAlternativeDto | null>(null);

	const resetSelection = useCallback(() => {
		setSelectedAlternative(null);
	}, []);

	useMealItemDetailSheetVisibility(payload, ref, resetSelection);

	const closeSheet = useCallback(() => {
		setSelectedAlternative(null);
		onClose();
	}, [onClose]);

	const {
		submitOverride,
		restoreOriginalForDay,
		resetOverrideSubmissionState,
		isSubmittingDay,
		isSubmittingPlan,
		isRestoringForDay,
	} = useMealItemDetailOverrideActions(
		payload,
		selectedAlternative,
		closeSheet
	);

	const handleClose = useCallback(() => {
		resetOverrideSubmissionState();
		closeSheet();
	}, [closeSheet, resetOverrideSubmissionState]);

	const alternativesQuery = useMealItemAlternatives({
		assignmentId: payload?.dietPlanAssignmentId ?? "",
		dietPlanMealId: payload?.dietPlanMealId ?? "",
		mealItemId: payload?.item.mealItemId ?? "",
		date: payload?.consumedDate,
		enabled: payload != null,
	});

	const renderFooter = useCallback(
		(props: BottomSheetFooterProps) => (
			<SheetFooter {...props}>
				<MealItemDetailActions
					isRestoringForDay={isRestoringForDay}
					isSubmittingDay={isSubmittingDay}
					isSubmittingPlan={isSubmittingPlan}
					itemIsOverridden={payload?.item.isOverridden ?? false}
					onReplaceDay={() => submitOverride("day")}
					onReplacePlan={() => submitOverride("plan")}
					onRestoreOriginalForDay={restoreOriginalForDay}
					selectedAlternative={selectedAlternative}
				/>
			</SheetFooter>
		),
		[
			isRestoringForDay,
			isSubmittingDay,
			isSubmittingPlan,
			payload?.item.isOverridden,
			restoreOriginalForDay,
			selectedAlternative,
			submitOverride,
		]
	);

	return (
		<AppBottomSheet
			footerComponent={renderFooter}
			headerTitle="Meal item"
			onClose={handleClose}
			ref={ref}
		>
			{payload ? (
				<MealItemDetailContent
					alternatives={alternativesQuery.data?.data ?? []}
					isError={alternativesQuery.isError}
					isLoading={alternativesQuery.isPending}
					item={payload.item}
					onSelectAlternative={setSelectedAlternative}
					selectedAlternative={selectedAlternative}
				/>
			) : null}
		</AppBottomSheet>
	);
}
