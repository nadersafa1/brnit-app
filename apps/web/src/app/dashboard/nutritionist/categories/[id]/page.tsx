'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { authClient } from '@/lib/auth-client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft } from 'lucide-react'
import { useFoodCategory } from '@/hooks/use-food-category'
import { useOrganizationContext } from '@/hooks/authorization/use-organization-context'
import { canAccessNutritionistFeatures } from '@/lib/authorization/nutritionist-access'

export default function NutritionistCategoryDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { data: session } = authClient.useSession()
  const { context } = useOrganizationContext()
  const { data: category, isLoading, error, refetch } = useFoodCategory(
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

  if (isLoading || !category) {
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
        <Link href="/dashboard/nutritionist/categories">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to categories
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
      <Link href="/dashboard/nutritionist/categories">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to categories
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">{category.name}</h2>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Created:{' '}
            {category.createdAt
              ? new Date(category.createdAt).toLocaleDateString()
              : '–'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
