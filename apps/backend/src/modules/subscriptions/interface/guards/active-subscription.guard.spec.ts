import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { ActiveSubscriptionGuard } from "./active-subscription.guard";
import { EntitlementsService } from "../../application/entitlements.service";
import { SubscriptionRequiredException } from "../../domain/exceptions/subscription-required.exception";

function buildContext(orgId: string | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ params: { orgId } }),
    }),
  } as unknown as ExecutionContext;
}

describe("ActiveSubscriptionGuard", () => {
  it("allows access when the org has a standard entitlement", async () => {
    const entitlements = {
      resolve: jest.fn().mockResolvedValue({
        plan: "standard",
        status: "active",
        source: "stripe",
      }),
    } as unknown as jest.Mocked<EntitlementsService>;

    const guard = new ActiveSubscriptionGuard(entitlements);

    await expect(guard.canActivate(buildContext("org-1"))).resolves.toBe(
      true,
    );
    expect(entitlements.resolve).toHaveBeenCalledWith("org-1");
  });

  it("throws SubscriptionRequiredException when the org is locked", async () => {
    const entitlements = {
      resolve: jest.fn().mockResolvedValue({
        plan: "locked",
        status: "canceled",
        source: "none",
      }),
    } as unknown as jest.Mocked<EntitlementsService>;

    const guard = new ActiveSubscriptionGuard(entitlements);

    await expect(guard.canActivate(buildContext("org-1"))).rejects.toThrow(
      SubscriptionRequiredException,
    );
  });

  it("throws ForbiddenException when orgId is missing from params", async () => {
    const entitlements = {
      resolve: jest.fn(),
    } as unknown as jest.Mocked<EntitlementsService>;

    const guard = new ActiveSubscriptionGuard(entitlements);

    await expect(guard.canActivate(buildContext(undefined))).rejects.toThrow(
      ForbiddenException,
    );
    expect(entitlements.resolve).not.toHaveBeenCalled();
  });
});
