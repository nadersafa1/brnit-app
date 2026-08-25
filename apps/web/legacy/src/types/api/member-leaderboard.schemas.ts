import { z } from 'zod'

/** Query for organization leaderboard: optional orgId. */
export const memberLeaderboardQuerySchema = z.object({
  orgId: z.string().min(1).max(64).optional(),
})

export type MemberLeaderboardQuery = z.infer<typeof memberLeaderboardQuerySchema>
