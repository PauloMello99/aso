import { z } from "zod"

export const UNSUBSCRIBE_TRIGGERS = [
  "post_service",
  "birthday",
  "inactivity",
] as const

/**
 * Body opcional de `POST /public/campaigns/unsubscribe/:token`. Sem `trigger`
 * (ou body vazio) = opt-out global.
 */
export const unsubscribeBodySchema = z.object({
  trigger: z.enum(UNSUBSCRIBE_TRIGGERS).optional(),
})

export type UnsubscribeBody = z.infer<typeof unsubscribeBodySchema>
