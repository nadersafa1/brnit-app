'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { DietPlan } from '@/lib/queries/diet-plans'

interface DietPlanMetadataCardProps {
  plan: DietPlan
}

export function DietPlanMetadataCard({ plan }: DietPlanMetadataCardProps) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">{plan.name}</h2>
        {plan.description && (
          <p className="text-sm text-muted-foreground">{plan.description}</p>
        )}
      </CardHeader>
    </Card>
  )
}
