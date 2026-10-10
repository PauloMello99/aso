import { redactPublicPath } from "./redact-public-path";

describe("redactPublicPath", () => {
  it("redacts the token segment and keeps the rest", () => {
    expect(redactPublicPath("/public/anamnesis/abc123/submit")).toBe(
      "/public/anamnesis/:param/submit",
    );
  });

  it("redacts a slug segment", () => {
    expect(redactPublicPath("/public/quote-forms/maria/requests")).toBe(
      "/public/quote-forms/:param/requests",
    );
  });

  it("strips the query string", () => {
    expect(redactPublicPath("/public/appointment-confirmations/tok?x=1")).toBe(
      "/public/appointment-confirmations/:param",
    );
  });

  it("preserves static /public/support paths", () => {
    expect(redactPublicPath("/public/support/categories")).toBe(
      "/public/support/categories",
    );
  });

  it("redacts campaign tokens at the 5th segment", () => {
    expect(redactPublicPath("/public/campaigns/preferences/tok123")).toBe(
      "/public/campaigns/preferences/:param",
    );
    expect(redactPublicPath("/public/campaigns/unsubscribe/tok123")).toBe(
      "/public/campaigns/unsubscribe/:param",
    );
  });

  it("does not redact billing/plans", () => {
    expect(redactPublicPath("/public/billing/plans")).toBe(
      "/public/billing/plans",
    );
  });

  it("keeps action literals (submit, respond, requests)", () => {
    expect(redactPublicPath("/public/appointment-confirmations/t/respond")).toBe(
      "/public/appointment-confirmations/:param/respond",
    );
    expect(redactPublicPath("/public/customer-registrations/t/submit")).toBe(
      "/public/customer-registrations/:param/submit",
    );
  });

  it("leaves non-public paths unchanged (minus query)", () => {
    expect(redactPublicPath("/orgs/123/customers?page=1")).toBe(
      "/orgs/123/customers",
    );
  });

  it("leaves /public/<resource> without a segment unchanged", () => {
    expect(redactPublicPath("/public/anamnesis")).toBe("/public/anamnesis");
  });
});
