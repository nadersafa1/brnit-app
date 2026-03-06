'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useCallback, useState } from 'react'
import { toast } from 'sonner'

import { authClient } from '@/lib/auth-client'
import { Card, CardContent } from '@/components/ui/card'
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
import AdminUsersTable from './components/admin-users-table'
import { ChangeRoleDialog } from './components/change-role-dialog'
import { useAdminUsers } from './hooks/use-admin-users'
import type { AdminUser } from './types'

const AdminPage = () => {
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const {
    users,
    pagination,
    filters,
    setFilters,
    isLoading,
    error,
    refetch,
    clearError,
  } = useAdminUsers()

  const [banUser, setBanUser] = useState<AdminUser | null>(null)
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null)
  const [roleUser, setRoleUser] = useState<AdminUser | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (session === null || (session?.user && session.user.role !== 'admin')) {
      router.replace('/dashboard')
    }
  }, [session, router])

  const handleImpersonate = useCallback(
    (user: AdminUser) => {
      authClient.admin.impersonateUser(
        { userId: user.id },
        {
          onSuccess: () => {
            toast.success('Impersonating – redirecting')
            globalThis.window.location.href = '/dashboard'
          },
          onError: (ctx) => {
            toast.error(String(ctx.error?.message ?? 'Impersonation failed'))
          },
        }
      )
    },
    []
  )

  const handleBan = useCallback((user: AdminUser) => setBanUser(user), [])
  const handleBanConfirm = useCallback(() => {
    if (!banUser) return
    authClient.admin.banUser(
      { userId: banUser.id },
      {
        onSuccess: () => {
          toast.success('User banned')
          setBanUser(null)
          refetch()
        },
        onError: (ctx) => { toast.error(String(ctx.error?.message ?? 'Failed to ban')); },
      }
    )
  }, [banUser, refetch])
  const handleUnban = useCallback(
    (user: AdminUser) => {
      authClient.admin.unbanUser(
        { userId: user.id },
        {
          onSuccess: () => {
            toast.success('User unbanned')
            refetch()
          },
          onError: (ctx) => { toast.error(String(ctx.error?.message ?? 'Failed to unban')); },
        }
      )
    },
    [refetch]
  )

  const handleChangeRole = useCallback((user: AdminUser) => setRoleUser(user), [])
  const handleChangeRoleConfirm = useCallback(
    (userId: string, role: string) =>
      new Promise<void>((resolve, reject) => {
        authClient.admin.setRole(
          { userId, role: role } as { userId: string; role: 'admin' | 'user' },
          {
            onSuccess: () => {
              toast.success('Role updated')
              setRoleUser(null)
              refetch()
              resolve()
            },
            onError: (ctx) => {
              const message = String(ctx.error?.message ?? 'Failed to update role')
              toast.error(message)
              reject(new Error(message))
            },
          }
        )
      }),
    [refetch]
  )

  const handleDelete = useCallback((user: AdminUser) => setDeleteUser(user), [])
  const handleDeleteConfirm = useCallback(() => {
    if (!deleteUser) return
    setIsDeleting(true)
    authClient.admin.removeUser(
      { userId: deleteUser.id },
      {
        onSuccess: () => {
          toast.success('User deleted')
          setDeleteUser(null)
          setIsDeleting(false)
          refetch()
        },
        onError: (ctx) => {
          toast.error(String(ctx.error?.message ?? 'Failed to delete'))
          setIsDeleting(false)
        },
      }
    )
  }, [deleteUser, refetch])

  if (session?.user?.role !== 'admin') return null

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">{error}</p>
          <button type="button" onClick={() => { clearError(); refetch(); }} className="mt-4 text-sm underline">
            Try again
          </button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Admin – Users</h2>
      <Card>
        <CardContent className="pt-6">
          <AdminUsersTable
            users={users}
            pagination={pagination}
            onPageChange={(page) => setFilters({ ...filters, page })}
            onPageSizeChange={(perPage) => setFilters({ ...filters, perPage, page: 1 })}
            onSearchChange={(q) => setFilters({ ...filters, q, page: 1 })}
            searchValue={filters.q}
            role={filters.role}
            onRoleChange={(role) => setFilters({ ...filters, role, page: 1 })}
            sortBy={filters.sortBy}
            sortOrder={filters.sortOrder}
            onSortingChange={(sortBy, sortOrder) =>
              setFilters({ ...filters, sortBy: sortBy ?? 'createdAt', sortOrder: sortOrder ?? 'desc', page: 1 })
            }
            isLoading={isLoading}
            onRefetch={refetch}
            onImpersonate={handleImpersonate}
            onChangeRole={handleChangeRole}
            onBan={handleBan}
            onUnban={handleUnban}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      <AlertDialog open={!!banUser} onOpenChange={(open) => !open && setBanUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ban user</AlertDialogTitle>
            <AlertDialogDescription>
              Ban {banUser?.name ?? banUser?.email}? They will not be able to sign in and their sessions will be revoked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBanConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Ban
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ChangeRoleDialog
        user={roleUser}
        open={!!roleUser}
        onOpenChange={(open) => !open && setRoleUser(null)}
        onConfirm={handleChangeRoleConfirm}
      />

      <AlertDialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete {deleteUser?.name ?? deleteUser?.email}? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default AdminPage
