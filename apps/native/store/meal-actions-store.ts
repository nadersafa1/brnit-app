import { create } from 'zustand'
import type { CurrentDietPlanMealItem } from '@/lib/api/member-types'

export type SelectedMeal = { dietPlanMealId: string }

export type SelectedMealItemForDetails = {
  item: CurrentDietPlanMealItem
  meal: SelectedMeal
}

type MealDetailsState = {
  selectedMealItemForDetails: SelectedMealItemForDetails | null
}

type MealDetailsActions = {
  openMealDetails: (item: CurrentDietPlanMealItem, meal: SelectedMeal) => void
  openAlternatives: (item: CurrentDietPlanMealItem, meal: SelectedMeal) => void
  closeMealDetails: () => void
}

type MealActionsStore = MealDetailsState & MealDetailsActions

export const useMealActionsStore = create<MealActionsStore>(set => ({
  selectedMealItemForDetails: null,

  openMealDetails: (item, meal) =>
    set({ selectedMealItemForDetails: { item, meal } }),

  openAlternatives: (item, meal) =>
    set({ selectedMealItemForDetails: { item, meal } }),

  closeMealDetails: () => set({ selectedMealItemForDetails: null }),
}))
