import Link from 'next/link'
import type { Route } from 'next'

export type FoodCategoryLinksBasePath =
  | '/dashboard/admin/categories'
  | '/dashboard/nutritionist/categories'

export interface FoodCategoryLinksProps {
  categories: { id: string; name: string }[] | undefined | null
  basePath: FoodCategoryLinksBasePath
  emptyLabel?: string
}

/** Comma-separated category names, each linking to that category’s detail page. */
export function FoodCategoryLinks({
  categories,
  basePath,
  emptyLabel = '–',
}: Readonly<FoodCategoryLinksProps>) {
  if (!categories?.length) {
    return <span className='text-muted-foreground'>{emptyLabel}</span>
  }

  return (
    <>
      {categories.map((c, i) => (
        <span key={c.id}>
          {i > 0 ? <span className='text-muted-foreground'>, </span> : null}
          <Link
            href={`${basePath}/${c.id}` as Route}
            className='text-foreground underline-offset-4 hover:underline'
          >
            {c.name}
          </Link>
        </span>
      ))}
    </>
  )
}
