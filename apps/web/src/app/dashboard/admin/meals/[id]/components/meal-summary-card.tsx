'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { MealItem } from '@/lib/queries/meals'

interface MealSummaryCardProps {
  mealItems: MealItem[]
}

function scaleNutrient(per100: number | null, quantity: number): number {
  if (per100 == null) return 0
  return Math.round((per100 / 100) * quantity * 10) / 10
}

export function MealSummaryCard({ mealItems }: Readonly<MealSummaryCardProps>) {
  const totals = mealItems.reduce(
    (acc, mi) => ({
      calories: acc.calories + scaleNutrient(mi.calories, mi.quantity),
      protein: acc.protein + scaleNutrient(mi.protein, mi.quantity),
      carbs: acc.carbs + scaleNutrient(mi.carbs, mi.quantity),
      fat: acc.fat + scaleNutrient(mi.fat, mi.quantity),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

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
