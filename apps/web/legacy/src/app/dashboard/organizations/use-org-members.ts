'use client'

import { useCallback, useEffect, useState } from 'react'
import { authClient } from '@/lib/auth-client'
import type { Member } from 'better-auth/plugins'
import type { User } from 'better-auth/types'

export const useOrgMembers = (
  organizationId: string | null,
  roleFilter?: string
) => {
  const [members, setMembers] = useState<(Member & { user: User })[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!organizationId) {
      setMembers([])
      return
    }
    setLoading(true)
    setError(null)
    const res = await authClient.organization.listMembers({ query: { organizationId } })
    if (res?.error) {
      setError(res.error.message ?? 'Failed to load members')
      setMembers([])
    } else {
      let list = (res.data.members ?? []) as (Member & { user: User })[]
      if (roleFilter) {
        list = list.filter((m) => m.role === roleFilter)
      }
      setMembers(list)
    }
    setLoading(false)
  }, [organizationId, roleFilter])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { members, loading, error, refetch }
}
