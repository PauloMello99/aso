import "reflect-metadata";
import { PublicQuoteFormsController } from "./public-quote-forms.controller";
import { PublicQuoteFormFeatureFlagGuard } from "./public-quote-form-feature-flag.guard";
import { QuoteCaptchaGuard } from "./quote-captcha.guard";
import { QuoteFormsController } from "./quote-forms.controller";

describe("PublicQuoteFormsController metadata", () => {
  const handler = PublicQuoteFormsController.prototype.submit;

  it("applies the feature flag guard at class level", () => {
    const guards = Reflect.getMetadata(
      "__guards__",
      PublicQuoteFormsController,
    ) as unknown[];
    expect(guards).toEqual([PublicQuoteFormFeatureFlagGuard]);
  });

  it("runs the captcha guard on the submit handler, before any interceptor", () => {
    const guards = Reflect.getMetadata("__guards__", handler) as unknown[];
    expect(guards).toContain(QuoteCaptchaGuard);

    // Nest executa guards antes de interceptors: o captcha (guard) so precede o
    // multer (FilesInterceptor) se estiver em __guards__, e nao em interceptors.
    const interceptors = Reflect.getMetadata(
      "__interceptors__",
      handler,
    ) as unknown[];
    expect(interceptors).toHaveLength(1);
    expect(interceptors).not.toContain(QuoteCaptchaGuard);
  });
});

describe("QuoteFormsController metadata", () => {
  it("puts the feature flag guard before auth", () => {
    const guards = Reflect.getMetadata(
      "__guards__",
      QuoteFormsController,
    ) as unknown[];
    expect(guards[0]).toBe(PublicQuoteFormFeatureFlagGuard);
  });
});
