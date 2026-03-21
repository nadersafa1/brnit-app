'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { getMacroFactor } from '@/lib/helpers/macros'
import { roundNutritionMacro } from '@/lib/helpers/nutrition-numbers'
import type { MealItem } from '@/lib/queries/meals'

interface MealSummaryCardProps {
  mealItems: MealItem[]
}

/**
 * Nutrition values are stored per 1 unit (per 100g or per selected food unit),
 * so we reuse the shared macro factor logic for consistent totals.
 */
function scaleNutrient(perUnit: number | null, quantity: number, unit: MealItem['unit']): number {
  if (perUnit == null) return 0
  return getMacroFactor(quantity, unit) * perUnit
}

export function MealSummaryCard({ mealItems }: Readonly<MealSummaryCardProps>) {
  // Aggregate raw nutrient totals first to avoid compounding per-item rounding error.
  const rawTotals = mealItems.reduce(
    (acc, mi) => ({
      calories: acc.calories + scaleNutrient(mi.calories, mi.quantity, mi.unit),
      protein: acc.protein + scaleNutrient(mi.protein, mi.quantity, mi.unit),
      carbs: acc.carbs + scaleNutrient(mi.carbs, mi.quantity, mi.unit),
      fat: acc.fat + scaleNutrient(mi.fat, mi.quantity, mi.unit),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )
  const totals = {
    calories: roundNutritionMacro(rawTotals.calories),
    protein: roundNutritionMacro(rawTotals.protein),
    carbs: roundNutritionMacro(rawTotals.carbs),
    fat: roundNutritionMacro(rawTotals.fat),
  }

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
