import { ExecutionContext } from "@nestjs/common";
import { QuoteCaptchaGuard } from "./quote-captcha.guard";
import { ICaptchaVerifier } from "../../support/domain/ports/captcha-verifier.port";
import { CaptchaVerificationFailedException } from "../../support/domain/exceptions/captcha-verification-failed.exception";

function buildContext(headers: Record<string, unknown>): ExecutionContext {
  const req = {
    headers,
    ip: "203.0.113.7",
    socket: { remoteAddress: "10.0.0.1" },
  };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

function buildVerifier(result: boolean): jest.Mocked<ICaptchaVerifier> {
  return {
    verify: jest.fn().mockResolvedValue(result),
  } as unknown as jest.Mocked<ICaptchaVerifier>;
}

describe("QuoteCaptchaGuard", () => {
  it("rejects a missing header without calling the verifier", async () => {
    const verifier = buildVerifier(true);
    await expect(
      new QuoteCaptchaGuard(verifier).canActivate(buildContext({})),
    ).rejects.toBeInstanceOf(CaptchaVerificationFailedException);
    expect(verifier.verify).not.toHaveBeenCalled();
  });

  it("rejects an oversized token without calling the verifier", async () => {
    const verifier = buildVerifier(true);
    await expect(
      new QuoteCaptchaGuard(verifier).canActivate(
        buildContext({ "x-turnstile-token": "x".repeat(2049) }),
      ),
    ).rejects.toBeInstanceOf(CaptchaVerificationFailedException);
    expect(verifier.verify).not.toHaveBeenCalled();
  });

  it("rejects when the verifier says false", async () => {
    await expect(
      new QuoteCaptchaGuard(buildVerifier(false)).canActivate(
        buildContext({ "x-turnstile-token": "tok" }),
      ),
    ).rejects.toBeInstanceOf(CaptchaVerificationFailedException);
  });

  it("passes when the verifier says true, forwarding the ip", async () => {
    const verifier = buildVerifier(true);
    await expect(
      new QuoteCaptchaGuard(verifier).canActivate(
        buildContext({ "x-turnstile-token": "tok" }),
      ),
    ).resolves.toBe(true);
    expect(verifier.verify).toHaveBeenCalledWith("tok", "203.0.113.7");
  });
});
