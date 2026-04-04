'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { CreateFoodItemDialog } from '../../food-items/components/create-food-item-dialog'
import type { FoodCategory } from '@/lib/queries/food-categories'

type AdminCategoryAddFoodItemActionProps = {
  readonly categoryId: string
  readonly categoryName: string
  readonly categories: FoodCategory[]
  readonly onCreated: () => void
}

const ADD_ITEM_TITLE = 'Add food item to this category'

function addItemDescription(categoryName: string) {
  return `"${categoryName}" will always be linked. Optionally select more categories below.`
}

/** Header action + create dialog: new items always include this category; user may add more. */
export function AdminCategoryAddFoodItemAction({
  categoryId,
  categoryName,
  categories,
  onCreated,
}: AdminCategoryAddFoodItemActionProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button type='button' size='sm' variant='outline' onClick={() => setOpen(true)} className='gap-2 shrink-0'>
        <Plus className='h-4 w-4' />
        Add food item
      </Button>
      <CreateFoodItemDialog
        open={open}
        onOpenChange={setOpen}
        categories={categories}
        lockedCategoryIds={[categoryId]}
        title={ADD_ITEM_TITLE}
        description={addItemDescription(categoryName)}
        onSuccess={onCreated}
      />
    </>
  )
}
