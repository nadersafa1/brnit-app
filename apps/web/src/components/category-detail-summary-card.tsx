import { Card, CardContent, CardHeader } from '@/components/ui/card'

/** Read-only category header used on admin + nutritionist category detail routes. */
export function CategoryDetailSummaryCard({
  name,
  description,
  createdAt,
}: Readonly<{
  name: string
  description: string | null
  createdAt: string | undefined
}>) {
  return (
    <Card>
      <CardHeader>
        <h2 className='text-lg font-semibold'>{name}</h2>
      </CardHeader>
      <CardContent className='space-y-2'>
        {description?.trim() ? (
          <p className='text-sm text-foreground whitespace-pre-wrap'>{description.trim()}</p>
        ) : null}
        <p className='text-sm text-muted-foreground'>
          Created: {createdAt ? new Date(createdAt).toLocaleDateString() : '–'}
        </p>
      </CardContent>
    </Card>
  )
}
