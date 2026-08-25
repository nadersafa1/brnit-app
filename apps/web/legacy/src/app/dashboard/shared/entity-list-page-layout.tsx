'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { LucideIcon } from 'lucide-react'

export interface EntityListPageLayoutProps {
  title: string
  icon: LucideIcon
  createButton?: React.ReactNode
  error?: string | null
  onRetry?: () => void
  children: React.ReactNode
}

export function EntityListPageLayout({
  title,
  icon: Icon,
  createButton,
  error,
  onRetry,
  children,
}: EntityListPageLayoutProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        {createButton}
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
            {onRetry && (
              <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
                Retry
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {!error && (
        <Card>
          <CardContent className="pt-6">{children}</CardContent>
        </Card>
      )}
    </div>
  )
}
