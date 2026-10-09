import "reflect-metadata";
import { QuoteRequestsController } from "./quote-requests.controller";
import { PublicQuoteFormFeatureFlagGuard } from "./public-quote-form-feature-flag.guard";
import { AuthGuard } from "../../auth/guards/auth.guard";
import { OrgMembershipGuard } from "../../auth/guards/org-membership.guard";
import { OrgModuleGuard } from "../../auth/guards/org-module.guard";
import { ActiveSubscriptionGuard } from "../../subscriptions/interface/guards/active-subscription.guard";
import { REQUIRE_MODULE_KEY } from "../../auth/decorators/require-module.decorator";

const proto = QuoteRequestsController.prototype;

describe("QuoteRequestsController metadata", () => {
  it("compoe os guards na ordem: flag, auth, membership, modulo", () => {
    expect(
      Reflect.getMetadata("__guards__", QuoteRequestsController),
    ).toEqual([
      PublicQuoteFormFeatureFlagGuard,
      AuthGuard,
      OrgMembershipGuard,
      OrgModuleGuard,
    ]);
  });

  it("exige o modulo quotes e a rota base orgs/:orgId/quotes", () => {
    expect(
      Reflect.getMetadata(REQUIRE_MODULE_KEY, QuoteRequestsController),
    ).toBe("quotes");
    expect(Reflect.getMetadata("path", QuoteRequestsController)).toBe(
      "orgs/:orgId/quotes",
    );
  });

  it.each(["list", "unreadCount", "detail"] as const)(
    "%s responde com Cache-Control: no-store",
    (method) => {
      const headers = Reflect.getMetadata("__headers__", proto[method]) as Array<{
        name: string;
        value: string;
      }>;
      expect(headers).toContainEqual({
        name: "Cache-Control",
        value: "no-store",
      });
    },
  );

  it("declara unread-count antes de :id (senao seria capturado como id)", () => {
    const methods = Object.getOwnPropertyNames(proto);
    expect(methods.indexOf("unreadCount")).toBeLessThan(methods.indexOf("detail"));
    expect(Reflect.getMetadata("path", proto.unreadCount)).toBe("unread-count");
    expect(Reflect.getMetadata("path", proto.detail)).toBe(":id");
  });

  it("schedule: POST :id/schedule, 200, no-store e ActiveSubscriptionGuard so nele", () => {
    expect(Reflect.getMetadata("path", proto.schedule)).toBe(":id/schedule");
    expect(Reflect.getMetadata("__httpCode__", proto.schedule)).toBe(200);
    expect(Reflect.getMetadata("__guards__", proto.schedule)).toEqual([
      ActiveSubscriptionGuard,
    ]);
    expect(Reflect.getMetadata("__headers__", proto.schedule)).toContainEqual({
      name: "Cache-Control",
      value: "no-store",
    });
  });

  it("decline: POST :id/decline, 200, no-store e SEM guard de assinatura", () => {
    expect(Reflect.getMetadata("path", proto.decline)).toBe(":id/decline");
    expect(Reflect.getMetadata("__httpCode__", proto.decline)).toBe(200);
    expect(Reflect.getMetadata("__guards__", proto.decline)).toBeUndefined();
    expect(Reflect.getMetadata("__headers__", proto.decline)).toContainEqual({
      name: "Cache-Control",
      value: "no-store",
    });
  });

  it("schedule delega com authId da sessao e startsAt parseado", async () => {
    const scheduleRequest = {
      execute: jest.fn().mockResolvedValue({ eventId: "ev-1" }),
    };
    const controller = new QuoteRequestsController(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      scheduleRequest as never,
      {} as never,
    );

    await controller.schedule(
      "org-1",
      "req-1",
      { id: "auth-1" } as never,
      { startsAt: "2099-10-20T17:00:00.000Z", durationMinutes: 45 },
    );

    expect(scheduleRequest.execute).toHaveBeenCalledWith({
      orgId: "org-1",
      authId: "auth-1",
      id: "req-1",
      startsAt: new Date("2099-10-20T17:00:00.000Z"),
      durationMinutes: 45,
    });
  });

  it("marcar como lido e POST :id/viewed com 204", () => {
    expect(Reflect.getMetadata("path", proto.viewed)).toBe(":id/viewed");
    expect(Reflect.getMetadata("__httpCode__", proto.viewed)).toBe(204);
  });
});
