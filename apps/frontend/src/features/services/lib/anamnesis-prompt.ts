export type AnamnesisPrompt = "hidden" | "send" | "resend"

export interface ResolveAnamnesisPromptInput {
  hasCurrentForm: boolean
  linkableCount: number
  submittedCount: number
}

export function resolveAnamnesisPrompt({
  hasCurrentForm,
  linkableCount,
  submittedCount,
}: ResolveAnamnesisPromptInput): AnamnesisPrompt {
  if (!hasCurrentForm || linkableCount > 0) return "hidden"
  if (submittedCount > 0) return "resend"
  return "send"
}
