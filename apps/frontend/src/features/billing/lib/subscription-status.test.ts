import { describe, expect, it } from "vitest"
import { isSubscriptionLocked, isSubscriptionPastDue } from "./subscription-status"
import type { Subscription } from "../types"

function makeSubscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: "sub_1",
    orgId: "org_1",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    type: "standard",
    status: "active",
    billingInterval: null,
    priceCents: null,
    stripePriceId: null,
    stripeCouponId: null,
    discountPercent: null,
    trialEndsAt: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    gracePeriodDays: 7,
    compReason: null,
    compGrantedBy: null,
    compExpiresAt: null,
    canceledAt: null,
    cancelAtPeriodEnd: false,
    trialConsumed: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  }
}

describe("isSubscriptionLocked", () => {
  it("returns true when there is no subscription", () => {
    expect(isSubscriptionLocked(null)).toBe(true)
  })

  it("returns false for a comp/custom subscription regardless of status", () => {
    expect(
      isSubscriptionLocked(makeSubscription({ type: "custom", status: "canceled" })),
    ).toBe(false)
  })

  it("returns false for trialing, active, and past_due", () => {
    expect(isSubscriptionLocked(makeSubscription({ status: "trialing" }))).toBe(false)
    expect(isSubscriptionLocked(makeSubscription({ status: "active" }))).toBe(false)
    expect(isSubscriptionLocked(makeSubscription({ status: "past_due" }))).toBe(false)
  })

  it("returns true for canceled", () => {
    expect(isSubscriptionLocked(makeSubscription({ status: "canceled" }))).toBe(true)
  })
})

describe("isSubscriptionPastDue", () => {
  it("returns true only when status is past_due", () => {
    expect(isSubscriptionPastDue(makeSubscription({ status: "past_due" }))).toBe(true)
  })

  it("returns false for active, trialing, canceled, or no subscription", () => {
    expect(isSubscriptionPastDue(makeSubscription({ status: "active" }))).toBe(false)
    expect(isSubscriptionPastDue(makeSubscription({ status: "trialing" }))).toBe(false)
    expect(isSubscriptionPastDue(makeSubscription({ status: "canceled" }))).toBe(false)
    expect(isSubscriptionPastDue(null)).toBe(false)
  })
})
