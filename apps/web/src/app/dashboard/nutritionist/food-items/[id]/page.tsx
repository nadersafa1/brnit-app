'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { authClient } from '@/lib/auth-client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft } from 'lucide-react'
import { useFoodItem } from '@/hooks/use-food-item'
import { useOrganizationContext } from '@/hooks/authorization/use-organization-context'
import { canAccessNutritionistFeatures } from '@/lib/authorization/nutritionist-access'

export default function NutritionistFoodItemDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { data: session } = authClient.useSession()
  const { context } = useOrganizationContext()
  const { data: item, isLoading, error, refetch } = useFoodItem(
    id,
    'nutritionist'
  )

  useEffect(() => {
    if (
      session === null ||
      !canAccessNutritionistFeatures(session, context)
    ) {
      router.replace('/dashboard')
    }
  }, [session, context, router])

  if (!canAccessNutritionistFeatures(session ?? null, context)) return null

  if (isLoading || !item) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-32" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/nutritionist/food-items">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to food items
          </Button>
        </Link>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link href="/dashboard/nutritionist/food-items">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to food items
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">{item.name}</h2>
          <p className="text-sm text-muted-foreground">
            {item.categoryName ?? 'No category'}
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>Calories: {item.calories ?? '–'}</div>
            <div>Protein: {item.protein ?? '–'} g</div>
            <div>Carbs: {item.carbs ?? '–'} g</div>
            <div>Fat: {item.fat ?? '–'} g</div>
            {item.servingSize && (
              <div>Serving size: {item.servingSize}</div>
            )}
            {item.fdcId != null && <div>FDC ID: {item.fdcId}</div>}
          </div>
          <p className="text-sm text-muted-foreground pt-2">
            Created:{' '}
            {item.createdAt
              ? new Date(item.createdAt).toLocaleDateString()
              : '–'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
