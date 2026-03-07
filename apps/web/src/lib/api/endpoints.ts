export const API_ENDPOINTS = {
  users: {
    organizationContext: '/api/users/me/organization-context',
  },
  nutritionist: {
    foodCategories: '/api/nutritionist/food-categories',
    foodCategory: (id: string) => `/api/nutritionist/food-categories/${id}`,
    foodItems: '/api/nutritionist/food-items',
    foodItem: (id: string) => `/api/nutritionist/food-items/${id}`,
    meals: '/api/nutritionist/meals',
    meal: (id: string) => `/api/nutritionist/meals/${id}`,
    dietPlans: '/api/nutritionist/diet-plans',
    dietPlan: (id: string) => `/api/nutritionist/diet-plans/${id}`,
    dietPlanAssignments: '/api/nutritionist/diet-plan-assignments',
    dietPlanAssignment: (id: string) => `/api/nutritionist/diet-plan-assignments/${id}`,
    dietPlanMealConsumptions: '/api/nutritionist/diet-plan-meal-consumptions',
    dietPlanMealConsumption: (id: string) => `/api/nutritionist/diet-plan-meal-consumptions/${id}`,
  },
  member: {
    dietPlanAssignments: '/api/member/me/diet-plan-assignments',
    dietPlanMealConsumptions: '/api/member/me/diet-plan-meal-consumptions',
  },
  admin: {
    foodItems: '/api/admin/food-items',
    foodItem: (id: string) => `/api/admin/food-items/${id}`,
    meals: '/api/admin/meals',
    meal: (id: string) => `/api/admin/meals/${id}`,
    dietPlans: '/api/admin/diet-plans',
    dietPlan: (id: string) => `/api/admin/diet-plans/${id}`,
    foodCategories: '/api/admin/food-categories',
    foodCategory: (id: string) => `/api/admin/food-categories/${id}`,
  },
} as const
