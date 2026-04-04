'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { getMacroFactor } from '@/lib/helpers/macros'
import { roundNutritionMacro } from '@/lib/helpers/nutrition-numbers'
import type { MealItem } from '@/lib/queries/meals'

export interface MealStoredTotals {
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
}

interface MealSummaryCardProps {
  mealItems: MealItem[]
  /** When set (from API), matches persisted meal row; avoids drift from client-side math. */
  storedTotals?: MealStoredTotals
}

function computeTotalsFromItems(mealItems: MealItem[]) {
  const rawTotals = mealItems.reduce(
    (acc, mi) => {
      const f = getMacroFactor(mi.quantity, mi.unit)
      return {
        calories: acc.calories + f * mi.calories,
        protein: acc.protein + f * mi.protein,
        carbs: acc.carbs + f * mi.carbs,
        fat: acc.fat + f * mi.fat,
      }
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )
  return {
    calories: roundNutritionMacro(rawTotals.calories),
    protein: roundNutritionMacro(rawTotals.protein),
    carbs: roundNutritionMacro(rawTotals.carbs),
    fat: roundNutritionMacro(rawTotals.fat),
  }
}

export function MealSummaryCard({ mealItems, storedTotals }: Readonly<MealSummaryCardProps>) {
  const totals = storedTotals
    ? {
        calories: storedTotals.totalCalories,
        protein: storedTotals.totalProtein,
        carbs: storedTotals.totalCarbs,
        fat: storedTotals.totalFat,
      }
    : computeTotalsFromItems(mealItems)

  return (
    <Card>
      <CardHeader>
        <h3 className='text-sm font-medium'>Nutrition Summary</h3>
      </CardHeader>
      <CardContent>
        <div className='flex flex-wrap gap-4 text-sm'>
          <span>
            <strong>{totals.calories}</strong> kcal
          </span>
          <span>
            <strong>{totals.protein}</strong> g protein
          </span>
          <span>
            <strong>{totals.carbs}</strong> g carbs
          </span>
          <span>
            <strong>{totals.fat}</strong> g fat
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
