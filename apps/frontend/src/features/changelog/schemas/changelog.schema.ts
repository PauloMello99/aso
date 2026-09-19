import { z } from "zod"

export const changelogAudienceSchema = z.enum(["all", "owners"])

export const changelogEntrySchema = z.object({
  id: z.string(),
  version: z.number().int(),
  title: z.string(),
  summary: z.string(),
  highlights: z.array(z.string()).nullish(),
  module: z.string().nullish(),
  audience: changelogAudienceSchema,
  publishedAt: z.string(),
  notifyOwners: z.boolean(),
})

export const changelogResponseSchema = z.object({
  entries: z.array(changelogEntrySchema),
  seenVersion: z.number().int().nullable(),
  latestVersion: z.number().int(),
})

export const markChangelogSeenSchema = z.object({
  version: z.number().int().min(1),
})

export type ChangelogEntry = z.infer<typeof changelogEntrySchema>
export type ChangelogResponse = z.infer<typeof changelogResponseSchema>
