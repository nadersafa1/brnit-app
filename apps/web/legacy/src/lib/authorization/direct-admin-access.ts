export function canAccessDirectAdminFeatures(
  session: { user?: { role?: string | null } } | null | undefined,
  context: {
    isAppAdmin?: boolean
    isDirectAdmin?: boolean
  }
): boolean {
  if (!session?.user) return false
  if (context.isAppAdmin) return true
  return !!context.isDirectAdmin
}
