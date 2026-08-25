'use client'

import { useState, useEffect } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AdminUser } from '../types'

const ROLES = ['admin', 'nutritionist', 'coach', 'user'] as const

export interface ChangeRoleDialogProps {
  user: AdminUser | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (userId: string, role: string) => Promise<void>
}

export const ChangeRoleDialog = ({
  user,
  open,
  onOpenChange,
  onConfirm,
}: ChangeRoleDialogProps) => {
  const [selectedRole, setSelectedRole] = useState<string>('user')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open && user) {
      setSelectedRole(user.role ?? 'user')
    }
  }, [open, user])

  const handleConfirm = async () => {
    if (!user) return
    setIsSubmitting(true)
    try {
      await onConfirm(user.id, selectedRole)
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Change role</AlertDialogTitle>
          <AlertDialogDescription>
            Set a new role for {user?.name ?? user?.email ?? 'this user'}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-2">
          <label htmlFor="change-role-select" className="text-sm font-medium">
            Role
          </label>
          <Select
            value={selectedRole}
            onValueChange={setSelectedRole}
            disabled={isSubmitting}
          >
            <SelectTrigger id="change-role-select" className="mt-1.5">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleConfirm()
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving…' : 'Save'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
