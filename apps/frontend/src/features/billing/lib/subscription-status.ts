import type { Subscription } from "../types"

export function isSubscriptionLocked(subscription: Subscription | null): boolean {
  if (!subscription) return true
  if (subscription.type === "custom") return false
  return !["trialing", "active", "past_due"].includes(subscription.status)
}

export function isSubscriptionPastDue(subscription: Subscription | null): boolean {
  return subscription?.status === "past_due"
}
