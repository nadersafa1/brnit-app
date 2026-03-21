import { useCallback, useEffect, useRef, useState } from "react";
import type { BottomSheetFooterProps } from "@gorhom/bottom-sheet";
import {
  AppBottomSheet,
  SheetFooter,
  type AppBottomSheetRef,
} from "@/components/bottom-sheet";
import { useMealItemAlternatives } from "@/hooks/use-meal-item-alternatives";
import { useSetMealItemOverride } from "@/hooks/use-set-meal-item-override";
import type { FoodItemAlternative } from "@/lib/api/member-food-types";
import { MealItemDetailActions } from "./meal-item-detail-actions";
import { MealItemDetailContent } from "./meal-item-detail-content";
import type { MealItemDetailSheetProps, OverrideScope } from "./types";

export function MealItemDetailSheet({ payload, onClose }: Readonly<MealItemDetailSheetProps>) {
  const ref = useRef<AppBottomSheetRef>(null);
  const [selectedAlternative, setSelectedAlternative] = useState<FoodItemAlternative | null>(null);
  const [submittingScope, setSubmittingScope] = useState<OverrideScope | null>(null);
  const setMealItemOverrideMutation = useSetMealItemOverride();

  const alternativesQuery = useMealItemAlternatives({
    assignmentId: payload?.dietPlanAssignmentId ?? "",
    dietPlanMealId: payload?.dietPlanMealId ?? "",
    mealItemId: payload?.item.mealItemId ?? "",
    date: payload?.consumedDate,
    enabled: payload != null,
  });

  // Keep sheet visibility controlled by selected payload from parent screen state.
  useEffect(() => {
    if (payload) {
      const frameId = requestAnimationFrame(() => {
        ref.current?.open(1);
      });
      setSelectedAlternative(null);
      return () => cancelAnimationFrame(frameId);
    }

    ref.current?.close();
    setSelectedAlternative(null);
  }, [payload]);

  const handleClose = useCallback(() => {
    setSelectedAlternative(null);
    setSubmittingScope(null);
    onClose();
  }, [onClose]);

  // Submit one override mutation with scope-specific body (date only for single-day override).
  const submitOverride = useCallback((scope: OverrideScope) => {
    if (!payload || !selectedAlternative) return;
    setSubmittingScope(scope);
    setMealItemOverrideMutation.mutate(
      {
        assignmentId: payload.dietPlanAssignmentId,
        dietPlanMealId: payload.dietPlanMealId,
        mealItemId: payload.item.mealItemId,
        foodItemId: selectedAlternative.foodItemId,
        quantity: selectedAlternative.suggestedQuantity,
        ...(scope === "day" ? { date: payload.consumedDate } : {}),
      },
      { onSuccess: handleClose, onSettled: () => setSubmittingScope(null) }
    );
  }, [handleClose, payload, selectedAlternative, setMealItemOverrideMutation]);

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <SheetFooter {...props}>
        <MealItemDetailActions
          selectedAlternative={selectedAlternative}
          isSubmittingDay={setMealItemOverrideMutation.isPending && submittingScope === "day"}
          isSubmittingPlan={setMealItemOverrideMutation.isPending && submittingScope === "plan"}
          onReplaceDay={() => submitOverride("day")}
          onReplacePlan={() => submitOverride("plan")}
        />
      </SheetFooter>
    ),
    [
      selectedAlternative,
      setMealItemOverrideMutation.isPending,
      submittingScope,
      submitOverride,
    ]
  );

  return (
    <AppBottomSheet ref={ref} onClose={handleClose} headerTitle="Meal item" footerComponent={renderFooter}>
      {payload ? (
        <MealItemDetailContent
          item={payload.item}
          alternatives={alternativesQuery.data?.data ?? []}
          isLoading={alternativesQuery.isLoading}
          isError={alternativesQuery.isError}
          selectedAlternative={selectedAlternative}
          onSelectAlternative={setSelectedAlternative}
        />
      ) : null}
    </AppBottomSheet>
  );
}
