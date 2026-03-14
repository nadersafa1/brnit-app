/**
 * Identifies a meal slot for consumption APIs (mark/unmark).
 * Used by both mark and delete consumption flows.
 */
export type ConsumptionSlot = {
  dietPlanAssignmentId: string;
  dietPlanMealId: string;
  consumedDate: string;
};
