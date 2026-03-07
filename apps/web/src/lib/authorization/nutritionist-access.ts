export function canAccessNutritionistFeatures(
  session: { user?: { role?: string | null } } | null | undefined,
  context: {
    isAppAdmin?: boolean
    isNutritionist?: boolean
    activeOrgId?: string | null
  }
): boolean {
  if (!session?.user) return false
  if (context.isAppAdmin) return true
  if (session.user.role === 'nutritionist') return true
  return !!(context.isNutritionist && context.activeOrgId)
}
