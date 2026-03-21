import Link from 'next/link'
import type { ComponentProps } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type AccessDeniedCardProps = Readonly<{
  title?: string
  description?: string
  backHref?: string
  backLabel?: string
}>

export function AccessDeniedCard({
  title = 'Not authorized',
  description = 'You do not have permission to view this section.',
  backHref = '/dashboard',
  backLabel = 'Back to dashboard',
}: AccessDeniedCardProps) {
  return (
    <Card className='max-w-lg'>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <p className='text-muted-foreground text-sm'>{description}</p>
        <Button asChild variant='outline' size='sm'>
          <Link href={backHref as ComponentProps<typeof Link>['href']}>{backLabel}</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
