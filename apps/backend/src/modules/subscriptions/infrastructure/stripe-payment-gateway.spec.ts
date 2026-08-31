import type Stripe from "stripe";
import type { ConfigService } from "@nestjs/config";
import {
  extractSubscriptionDiscountRef,
  mapCouponToDiscount,
  StripePaymentGateway,
  toNormalizedSubscription,
} from "./stripe-payment-gateway";
import type { TelemetryService } from "../../../common/telemetry/telemetry.service";

// Unix seconds used by the `toNormalizedSubscription` fixtures. The item-level
// values must win over the (decoy) root-level ones — see ADR-0016.
const ITEM_PERIOD_START = 1_700_000_000;
const ITEM_PERIOD_END = 1_700_086_400;
const ROOT_PERIOD_START = 1_600_000_000;
const ROOT_PERIOD_END = 1_600_086_400;

function buildStripeSubscription(
  overrides: Partial<Stripe.Subscription> = {},
): Stripe.Subscription {
  const base = {
    id: "sub_stripe_1",
    customer: "cus_1",
    status: "active",
    trial_end: null,
    canceled_at: null,
    cancel_at_period_end: false,
    // stripe@22.3.2 moved `current_period_start/end` off the Subscription root
    // and onto `items.data[0]`; these root values are decoys that must be
    // ignored (ADR-0016 gotcha).
    current_period_start: ROOT_PERIOD_START,
    current_period_end: ROOT_PERIOD_END,
    items: {
      data: [
        {
          id: "si_1",
          current_period_start: ITEM_PERIOD_START,
          current_period_end: ITEM_PERIOD_END,
          price: {
            id: "price_1",
            unit_amount: 4990,
            recurring: { interval: "month", interval_count: 1 },
          },
        },
      ],
    },
    discounts: [],
  };
  return { ...base, ...overrides } as unknown as Stripe.Subscription;
}

describe("extractSubscriptionDiscountRef", () => {
  it("returns { kind: 'none' } when there are no discounts", () => {
    const ref = extractSubscriptionDiscountRef({
      discounts: [],
    } as unknown as Stripe.Subscription);

    expect(ref).toEqual({ kind: "none" });
  });

  it("returns { kind: 'unexpanded' } when discounts[0] is a bare id string", () => {
    const ref = extractSubscriptionDiscountRef({
      discounts: ["di_123"],
    } as unknown as Stripe.Subscription);

    expect(ref).toEqual({ kind: "unexpanded" });
  });

  it("returns { kind: 'coupon_id' } when the expanded discount carries a bare coupon id", () => {
    const ref = extractSubscriptionDiscountRef({
      discounts: [{ source: { coupon: "coupon_abc" } }],
    } as unknown as Stripe.Subscription);

    expect(ref).toEqual({ kind: "coupon_id", couponId: "coupon_abc" });
  });

  it("returns { kind: 'coupon' } with the object when source.coupon is fully expanded", () => {
    const coupon = {
      id: "coupon_x",
      percent_off: 10,
    } as unknown as Stripe.Coupon;

    const ref = extractSubscriptionDiscountRef({
      discounts: [{ source: { coupon } }],
    } as unknown as Stripe.Subscription);

    expect(ref).toEqual({ kind: "coupon", coupon });
  });

  it("returns { kind: 'none' } when source.coupon is null or source is absent", () => {
    const nullCoupon = extractSubscriptionDiscountRef({
      discounts: [{ source: { coupon: null } }],
    } as unknown as Stripe.Subscription);
    const noSource = extractSubscriptionDiscountRef({
      discounts: [{}],
    } as unknown as Stripe.Subscription);

    expect(nullCoupon).toEqual({ kind: "none" });
    expect(noSource).toEqual({ kind: "none" });
  });

  it("uses only the first discount when more than one is present", () => {
    const ref = extractSubscriptionDiscountRef({
      discounts: [
        { source: { coupon: "coupon_first" } },
        { source: { coupon: "coupon_second" } },
      ],
    } as unknown as Stripe.Subscription);

    expect(ref).toEqual({ kind: "coupon_id", couponId: "coupon_first" });
  });
});

describe("mapCouponToDiscount", () => {
  it("keeps an integer percent_off on discountPercent", () => {
    expect(mapCouponToDiscount("c1", 20)).toEqual({
      stripeCouponId: "c1",
      discountPercent: 20,
      fractionalPercentOff: null,
    });
  });

  it("routes a fractional percent_off to fractionalPercentOff and nulls discountPercent", () => {
    expect(mapCouponToDiscount("c1", 33.33)).toEqual({
      stripeCouponId: "c1",
      discountPercent: null,
      fractionalPercentOff: 33.33,
    });
  });

  it("nulls both percent fields for an amount_off coupon (percentOff === null)", () => {
    expect(mapCouponToDiscount("c1", null)).toEqual({
      stripeCouponId: "c1",
      discountPercent: null,
      fractionalPercentOff: null,
    });
  });
});

describe("toNormalizedSubscription", () => {
  it("carries the caller-resolved discount onto the mirror columns", () => {
    const result = toNormalizedSubscription(buildStripeSubscription(), {
      stripeCouponId: "c1",
      discountPercent: 20,
    });

    expect(result.stripeCouponId).toBe("c1");
    expect(result.discountPercent).toBe(20);
  });

  it("keeps stripeCouponId and discountPercent null when the caller resolved no discount", () => {
    const result = toNormalizedSubscription(buildStripeSubscription(), {
      stripeCouponId: null,
      discountPercent: null,
    });

    expect(result.stripeCouponId).toBeNull();
    expect(result.discountPercent).toBeNull();
  });

  it("reads the billing period from items.data[0], not the subscription root (ADR-0016)", () => {
    const result = toNormalizedSubscription(buildStripeSubscription(), {
      stripeCouponId: null,
      discountPercent: null,
    });

    expect(result.currentPeriodStart).toEqual(
      new Date(ITEM_PERIOD_START * 1000),
    );
    expect(result.currentPeriodEnd).toEqual(new Date(ITEM_PERIOD_END * 1000));
    expect(result.currentPeriodStart).not.toEqual(
      new Date(ROOT_PERIOD_START * 1000),
    );
    expect(result.currentPeriodEnd).not.toEqual(
      new Date(ROOT_PERIOD_END * 1000),
    );
  });
});

/**
 * Exercises the one async step of discount resolution
 * (`StripePaymentGateway.resolveSubscriptionDiscount`) through the public
 * `getSubscription`. The Stripe SDK client is never constructed against the
 * network: the gateway is built with a fake `ConfigService` and the internal
 * `stripe` field is then swapped for a stub exposing only the two calls this
 * path makes (`subscriptions.retrieve`, `coupons.retrieve`).
 */
describe("StripePaymentGateway.resolveSubscriptionDiscount (via getSubscription)", () => {
  function buildConfigFake(): ConfigService {
    return {
      getOrThrow: jest.fn((key: string) => {
        if (key === "STRIPE_SECRET_KEY") return "sk_test_x";
        throw new Error(`unexpected config key requested in test: ${key}`);
      }),
    } as unknown as ConfigService;
  }

  function buildFakeTelemetry(): jest.Mocked<TelemetryService> {
    return {
      captureException: jest.fn(),
      captureMessage: jest.fn(),
      flush: jest.fn(),
    } as unknown as jest.Mocked<TelemetryService>;
  }

  interface StripeClientFake {
    subscriptions: { retrieve: jest.Mock };
    coupons: { retrieve: jest.Mock };
  }

  function buildGateway(): {
    gateway: StripePaymentGateway;
    telemetry: jest.Mocked<TelemetryService>;
    stripe: StripeClientFake;
  } {
    const telemetry = buildFakeTelemetry();
    const gateway = new StripePaymentGateway(buildConfigFake(), telemetry);
    const stripe: StripeClientFake = {
      subscriptions: { retrieve: jest.fn() },
      coupons: { retrieve: jest.fn() },
    };
    (gateway as unknown as { stripe: StripeClientFake }).stripe = stripe;
    return { gateway, telemetry, stripe };
  }

  function subscriptionWithDiscounts(discounts: unknown[]): Stripe.Subscription {
    return buildStripeSubscription({
      discounts,
    } as unknown as Partial<Stripe.Subscription>);
  }

  it("resolves an already-expanded coupon object without calling coupons.retrieve (case 1)", async () => {
    const { gateway, stripe } = buildGateway();
    stripe.subscriptions.retrieve.mockResolvedValue(
      subscriptionWithDiscounts([
        { source: { coupon: { id: "c1", percent_off: 20 } } },
      ]),
    );

    const result = await gateway.getSubscription("sub_x");

    expect(result?.stripeCouponId).toBe("c1");
    expect(result?.discountPercent).toBe(20);
    expect(stripe.coupons.retrieve).not.toHaveBeenCalled();
  });

  it("resolves a bare coupon id through coupons.retrieve (case 2)", async () => {
    const { gateway, stripe } = buildGateway();
    stripe.subscriptions.retrieve.mockResolvedValue(
      subscriptionWithDiscounts([{ source: { coupon: "c1" } }]),
    );
    stripe.coupons.retrieve.mockResolvedValue({ id: "c1", percent_off: 15 });

    const result = await gateway.getSubscription("sub_x");

    expect(result?.stripeCouponId).toBe("c1");
    expect(result?.discountPercent).toBe(15);
    expect(stripe.coupons.retrieve).toHaveBeenCalledTimes(1);
    expect(stripe.coupons.retrieve).toHaveBeenCalledWith("c1");
  });

  it("mirrors the coupon id with a null percent when the coupon is gone (resource_missing, case 3)", async () => {
    const { gateway, telemetry, stripe } = buildGateway();
    stripe.subscriptions.retrieve.mockResolvedValue(
      subscriptionWithDiscounts([{ source: { coupon: "c1" } }]),
    );
    stripe.coupons.retrieve.mockRejectedValue(
      Object.assign(new Error("resource_missing"), { code: "resource_missing" }),
    );

    const result = await gateway.getSubscription("sub_x");

    expect(result?.stripeCouponId).toBe("c1");
    expect(result?.discountPercent).toBeNull();
    expect(telemetry.captureMessage).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.anything(),
      expect.objectContaining({ code: "BILLING_COUPON_RESOLUTION_FAILED" }),
    );
  });

  it("mirrors the coupon id with a null percent and warns telemetry on a transient error (case 4)", async () => {
    const { gateway, telemetry, stripe } = buildGateway();
    stripe.subscriptions.retrieve.mockResolvedValue(
      subscriptionWithDiscounts([{ source: { coupon: "c1" } }]),
    );
    stripe.coupons.retrieve.mockRejectedValue(new Error("stripe 429"));

    const result = await gateway.getSubscription("sub_x");

    expect(result?.stripeCouponId).toBe("c1");
    expect(result?.discountPercent).toBeNull();
    expect(telemetry.captureMessage).toHaveBeenCalledWith(
      expect.any(String),
      "warn",
      expect.objectContaining({
        code: "BILLING_COUPON_RESOLUTION_FAILED",
        stripeSubscriptionId: "sub_stripe_1",
        stripeCouponId: "c1",
      }),
    );
  });

  it("returns a null discount and skips coupons.retrieve when there are no discounts (case 5)", async () => {
    const { gateway, stripe } = buildGateway();
    stripe.subscriptions.retrieve.mockResolvedValue(
      subscriptionWithDiscounts([]),
    );

    const result = await gateway.getSubscription("sub_x");

    expect(result?.stripeCouponId).toBeNull();
    expect(result?.discountPercent).toBeNull();
    expect(stripe.coupons.retrieve).not.toHaveBeenCalled();
  });

  it("warns telemetry when the discount came back unexpanded (case 6)", async () => {
    const { gateway, telemetry, stripe } = buildGateway();
    stripe.subscriptions.retrieve.mockResolvedValue(
      subscriptionWithDiscounts(["di_123"]),
    );

    const result = await gateway.getSubscription("sub_x");

    expect(result?.stripeCouponId).toBeNull();
    expect(result?.discountPercent).toBeNull();
    expect(telemetry.captureMessage).toHaveBeenCalledWith(
      expect.any(String),
      "warn",
      expect.objectContaining({
        code: "BILLING_SUBSCRIPTION_DISCOUNT_NOT_EXPANDED",
      }),
    );
  });

  it("warns telemetry and mirrors the first discount when several are present (case 7)", async () => {
    const { gateway, telemetry, stripe } = buildGateway();
    stripe.subscriptions.retrieve.mockResolvedValue(
      subscriptionWithDiscounts([
        { source: { coupon: { id: "c1", percent_off: 20 } } },
        { source: { coupon: { id: "c2", percent_off: 30 } } },
      ]),
    );

    const result = await gateway.getSubscription("sub_x");

    expect(result?.stripeCouponId).toBe("c1");
    expect(result?.discountPercent).toBe(20);
    expect(telemetry.captureMessage).toHaveBeenCalledWith(
      expect.any(String),
      "warn",
      expect.objectContaining({
        code: "BILLING_SUBSCRIPTION_MULTIPLE_DISCOUNTS_UNSUPPORTED",
      }),
    );
  });
});
