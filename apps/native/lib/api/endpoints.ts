export const API_ENDPOINTS = {
	member: {
		currentDietPlan: "/api/member/me/current-diet-plan",
		consumptionStreak: "/api/member/me/consumption-streak",
		recentAssessments: "/api/member/me/body-composition-assessments/recent",
		organizationLeaderboard: "/api/member/me/organization-leaderboard",
		dietPlanAssignments: "/api/member/me/diet-plan-assignments",
		dietPlanMealConsumptions: "/api/member/me/diet-plan-meal-consumptions",
		foodItems: "/api/member/me/food-items",
		foodCategories: "/api/member/me/food-categories",
		foodItemAlternatives: (foodItemId: string) =>
			`/api/member/me/food-items/${foodItemId}/alternatives`,
		mealItemOverride: (
			assignmentId: string,
			dietPlanMealId: string,
			mealItemId: string
		) =>
			`/api/member/me/diet-plan-assignments/${assignmentId}/meal-entries/${dietPlanMealId}/items/${mealItemId}/override`,
		mealItemAlternatives: (
			assignmentId: string,
			dietPlanMealId: string,
			mealItemId: string
		) =>
			`/api/member/me/diet-plan-assignments/${assignmentId}/meal-entries/${dietPlanMealId}/items/${mealItemId}/alternatives`,
	},
} as const;
