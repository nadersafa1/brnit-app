'use client'

import { Input } from '@/components/ui/input'

/** Minimal meal row for assignment time pickers (from diet plan detail). */
export type MealTimeAssignmentMeal = {
  id: string
  mealName: string
  mealType: string
  dayNumber: number
}

interface MealTimeAssignmentFieldsProps {
  meals: MealTimeAssignmentMeal[]
  valuesByMealId: Record<string, string>
  onChange: (dietPlanMealId: string, value: string) => void
  className?: string
}

/**
 * Per-meal optional local times for a diet plan assignment (nutritionist flows).
 */
export function MealTimeAssignmentFields({
  meals,
  valuesByMealId,
  onChange,
  className,
}: Readonly<MealTimeAssignmentFieldsProps>) {
  if (!meals.length) return null

  return (
    <div className={className ?? 'max-h-56 overflow-auto space-y-2 rounded-md border p-3'}>
      {meals.map((meal) => (
        <div key={meal.id} className="grid grid-cols-[1fr_auto] items-center gap-3">
          <div className="text-sm">
            <p className="font-medium">{meal.mealName}</p>
            <p className="text-muted-foreground capitalize">
              {meal.mealType} · {meal.dayNumber === 0 ? 'All days' : `Day ${meal.dayNumber}`}
            </p>
          </div>
          <Input
            type="time"
            value={valuesByMealId[meal.id] ?? ''}
            onChange={(e) => onChange(meal.id, e.target.value)}
            className="w-36"
          />
        </div>
      ))}
    </div>
  )
}
