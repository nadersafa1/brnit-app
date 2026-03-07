'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'

interface BulkSetQuantityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedCount: number
  onConfirm: (quantity: number) => Promise<void>
}

export function BulkSetQuantityDialog({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
}: BulkSetQuantityDialogProps) {
  const [quantity, setQuantity] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async () => {
    const q = Number.parseFloat(quantity)
    if (Number.isNaN(q) || q <= 0) {
      setError('Enter a positive number')
      return
    }
    setError(null)
    setIsLoading(true)
    try {
      await onConfirm(q)
      onOpenChange(false)
      setQuantity('')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setQuantity('')
      setError(null)
    }
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk set quantity</DialogTitle>
          <DialogDescription>
            Set quantity for {selectedCount} item{selectedCount !== 1 ? 's' : ''} (grams)
          </DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="bulk-quantity">Quantity (g)</FieldLabel>
          <Input
            id="bulk-quantity"
            type="number"
            min={0.1}
            step={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="e.g. 100"
            disabled={isLoading}
          />
          <FieldError errors={error ? [{ message: error }] : undefined} />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !quantity.trim()}>
            {isLoading ? 'Saving…' : 'Apply'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
