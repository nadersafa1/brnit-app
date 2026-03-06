import { getOrganizationContext } from '@/lib/organization-helpers'

export async function GET() {
  const context = await getOrganizationContext()
  return Response.json(context)
}
