import { z } from 'zod'

export const upsertOnboardingAnswersSchema = z.object({
  answers: z.record(
    z.string(),
    z.union([z.string(), z.array(z.string())]),
  ),
})

export type UpsertOnboardingAnswersInput = z.infer<typeof upsertOnboardingAnswersSchema>
