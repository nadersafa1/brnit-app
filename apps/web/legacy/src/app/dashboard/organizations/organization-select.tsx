'use client'

import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { authClient } from '@/lib/auth-client'
import { organizationContextKeys } from '@/lib/queries/organization-context'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const NO_ORG_VALUE = '__none__'

const OrganizationSelect = () => {
  const queryClient = useQueryClient()
  const { data: activeOrganization } = authClient.useActiveOrganization()
  const { data: organizations } = authClient.useListOrganizations()

  const handleOrganizationChange = (value: string) => {
    if (value === NO_ORG_VALUE) return
    authClient.organization
      .setActive({ organizationId: value }, {
        onError: (error) => {
          toast.error(error?.error?.message ?? 'Failed to switch organization')
        },
      })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: organizationContextKeys.all })
      })
  }

  if (!organizations?.length) return null

  const value = activeOrganization?.id ?? NO_ORG_VALUE

  return (
    <div className="space-y-2">
      <label htmlFor="org-select" className="text-sm font-medium">
        Select organization
      </label>
      <Select value={value} onValueChange={handleOrganizationChange}>
        <SelectTrigger id="org-select" className="w-full max-w-xs">
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_ORG_VALUE}>—</SelectItem>
          {organizations.map((org: { id: string; name: string }) => (
            <SelectItem key={org.id} value={org.id}>
              {org.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default OrganizationSelect
