'use client'

import * as React from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export interface TableFilterProps {
  label: string
  htmlFor?: string
  children: React.ReactNode
  className?: string
}

export const TableFilter = ({
  label,
  htmlFor,
  children,
  className,
}: TableFilterProps) => (
  <div className={cn('flex flex-col gap-2', className)}>
    {label && (
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </Label>
    )}
    {children}
  </div>
)
