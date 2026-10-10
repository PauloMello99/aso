import { NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PublicQuoteFormFeatureFlagGuard } from "./public-quote-form-feature-flag.guard";

function guardWith(value: string | undefined): PublicQuoteFormFeatureFlagGuard {
  const config = {
    get: jest.fn().mockReturnValue(value),
  } as unknown as ConfigService;
  return new PublicQuoteFormFeatureFlagGuard(config);
}

describe("PublicQuoteFormFeatureFlagGuard", () => {
  it("passes when the flag is 'true'", () => {
    expect(guardWith("true").canActivate()).toBe(true);
  });

  it("throws NotFoundException when the flag is absent", () => {
    expect(() => guardWith(undefined).canActivate()).toThrow(NotFoundException);
  });

  it("throws NotFoundException when the flag is 'false'", () => {
    expect(() => guardWith("false").canActivate()).toThrow(NotFoundException);
  });
});
