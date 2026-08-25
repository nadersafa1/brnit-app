import { getOrganizationContext } from '@/lib/organization-helpers'
import { withRequestLogging } from '@/lib/api-helpers/with-request-logging'

async function getHandler() {
  const context = await getOrganizationContext()
  return Response.json(context)
}

export const GET = withRequestLogging(getHandler)
