'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { Meal } from '@/lib/queries/meals'

interface MealMetadataCardProps {
  meal: Meal
}

export function MealMetadataCard({ meal }: MealMetadataCardProps) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">{meal.name}</h2>
        {meal.description && (
          <p className="text-sm text-muted-foreground">{meal.description}</p>
        )}
      </CardHeader>
    </Card>
  )
}
