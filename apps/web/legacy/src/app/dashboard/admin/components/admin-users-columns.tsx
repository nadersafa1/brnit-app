'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createSortableHeader, createTextColumn } from '@/lib/table-core'
import type { SortOrder } from '@/lib/table-core'
import type { AdminUser, AdminUsersSortBy } from '../types'
import { Ban, MoreHorizontal, Shield, Trash2, Unlock, UserCog } from 'lucide-react'

export interface CreateAdminUsersColumnsOptions {
  sortBy?: AdminUsersSortBy
  sortOrder?: SortOrder
  onSort?: (columnId: string) => void
  onImpersonate: (user: AdminUser) => void
  onChangeRole: (user: AdminUser) => void
  onBan: (user: AdminUser) => void
  onUnban: (user: AdminUser) => void
  onDelete: (user: AdminUser) => void
}

export function createAdminUsersColumns({
  sortBy,
  sortOrder,
  onSort,
  onImpersonate,
  onChangeRole,
  onBan,
  onUnban,
  onDelete,
}: CreateAdminUsersColumnsOptions): ColumnDef<AdminUser>[] {
  return [
    {
      id: 'name',
      accessorKey: 'name',
      header: () =>
        createSortableHeader('Name', 'name', sortBy, sortOrder, onSort),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    createTextColumn<AdminUser>('email', 'Email', (row) => row.email, {
      sortable: true,
      sortBy,
      sortOrder,
      onSort,
    }),
    {
      id: 'role',
      header: () =>
        createSortableHeader('Role', 'role', sortBy, sortOrder, onSort),
      cell: ({ row }) => {
        const role = row.original.role ?? 'user'
        return (
          <Badge variant={role === 'admin' ? 'destructive' : 'secondary'}>
            {role}
          </Badge>
        )
      },
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const banned = row.original.banned
        return banned ? (
          <Badge variant="destructive">Banned</Badge>
        ) : (
          <span className="text-muted-foreground text-sm">Active</span>
        )
      },
    },
    createTextColumn<AdminUser>(
      'createdAt',
      'Created',
      (row) => row.createdAt instanceof Date ? row.createdAt.toLocaleDateString() : String(row.createdAt),
      { sortable: true, sortBy, sortOrder, onSort }
    ),
    {
      id: 'actions',
      header: '',
      enableHiding: false,
      cell: ({ row }) => {
        const u = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onImpersonate(u)}>
                <UserCog className="mr-2 h-4 w-4" />
                Impersonate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChangeRole(u)}>
                <Shield className="mr-2 h-4 w-4" />
                Change role
              </DropdownMenuItem>
              {u.banned ? (
                <DropdownMenuItem onClick={() => onUnban(u)}>
                  <Unlock className="mr-2 h-4 w-4" />
                  Unban
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => onBan(u)}>
                  <Ban className="mr-2 h-4 w-4" />
                  Ban
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => onDelete(u)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
