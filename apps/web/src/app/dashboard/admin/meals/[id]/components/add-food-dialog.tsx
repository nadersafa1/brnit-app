'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { useFoodItems } from '@/hooks/use-food-items'
import { useFoodCategories } from '@/hooks/use-food-categories'
import type { DataSource } from '@/lib/queries/keys'
import type { FoodItem } from '@/lib/queries/food-items'

interface AddFoodDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (foodItemId: string, quantity: number) => Promise<void>
  excludeFoodIds?: string[]
  source?: DataSource
}

export function AddFoodDialog({
  open,
  onOpenChange,
  onAdd,
  excludeFoodIds = [],
  source = 'admin',
}: AddFoodDialogProps) {
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined)
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null)
  const [quantity, setQuantity] = useState('')
  const [quantityError, setQuantityError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const { data: foodItems, isLoading } = useFoodItems(
    {
      page: 1,
      perPage: 100,
      q: debouncedSearch.trim() || undefined,
      categoryId: categoryId || undefined,
    },
    source
  )

  const { data: categories } = useFoodCategories({ page: 1, perPage: 100 }, source)

  const filteredItems = useMemo(() => {
    return foodItems.filter((f) => !excludeFoodIds.includes(f.id))
  }, [foodItems, excludeFoodIds])

  const reset = () => {
    setSearchInput('')
    setDebouncedSearch('')
    setCategoryId(undefined)
    setSelectedFood(null)
    setQuantity('')
    setQuantityError(null)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const handleAdd = async () => {
    if (!selectedFood) return
    const q = Number.parseFloat(quantity)
    if (Number.isNaN(q) || q <= 0) {
      setQuantityError('Enter a positive number')
      return
    }
    setQuantityError(null)
    setIsSubmitting(true)
    try {
      await onAdd(selectedFood.id, q)
      setSelectedFood(null)
      setQuantity('')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] flex flex-col max-w-lg">
        <DialogHeader>
          <DialogTitle>Add food item</DialogTitle>
          <DialogDescription>
            Search and select a food item, then enter the quantity in grams.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0 flex flex-col">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Search by name..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <Select value={categoryId ?? 'all'} onValueChange={(v) => setCategoryId(v === 'all' ? undefined : v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {categories?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 overflow-auto rounded-md border min-h-[120px] max-h-[200px]">
            {isLoading ? (
              <div className="p-4 text-sm text-muted-foreground">Loading…</div>
            ) : filteredItems.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">No food items found.</div>
            ) : (
              <div className="divide-y">
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-muted/50 ${
                      selectedFood?.id === item.id ? 'bg-muted' : ''
                    }`}
                    onClick={() => setSelectedFood(item)}
                  >
                    <span className="font-medium">{item.name}</span>
                    {item.categoryName && (
                      <span className="text-muted-foreground ml-2">({item.categoryName})</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Field>
            <FieldLabel htmlFor="add-quantity">Quantity (g)</FieldLabel>
            <Input
              id="add-quantity"
              type="number"
              min={0.1}
              step={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 100"
              disabled={!selectedFood || isSubmitting}
            />
            <FieldError errors={quantityError ? [{ message: quantityError }] : undefined} />
          </Field>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!selectedFood || !quantity.trim() || isSubmitting}
          >
            {isSubmitting ? 'Adding…' : 'Add'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
