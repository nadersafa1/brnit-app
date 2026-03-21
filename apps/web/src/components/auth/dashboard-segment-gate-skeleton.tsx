import { Skeleton } from '@/components/ui/skeleton'

export function DashboardSegmentGateSkeleton() {
  return (
    <div className='space-y-4'>
      <Skeleton className='h-8 w-48' />
      <Skeleton className='h-32 w-full max-w-2xl' />
      <Skeleton className='h-24 w-full max-w-2xl' />
    </div>
  )
}
