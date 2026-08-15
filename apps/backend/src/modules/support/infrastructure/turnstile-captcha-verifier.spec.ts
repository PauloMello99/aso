import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TurnstileCaptchaVerifier } from "./turnstile-captcha-verifier";

function buildConfig(
  values: Record<string, string | undefined>,
): ConfigService {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

describe("TurnstileCaptchaVerifier", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("retorna true quando a Cloudflare responde success:true", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ success: true }),
    }) as unknown as typeof fetch;
    const verifier = new TurnstileCaptchaVerifier(
      buildConfig({ TURNSTILE_SECRET_KEY: "secret", NODE_ENV: "production" }),
    );

    await expect(verifier.verify("token")).resolves.toBe(true);
  });

  it("retorna false e loga error-codes quando a Cloudflare responde success:false", async () => {
    const warnSpy = jest
      .spyOn(Logger.prototype, "warn")
      .mockImplementation(() => undefined);
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({
        success: false,
        "error-codes": ["invalid-input-response"],
      }),
    }) as unknown as typeof fetch;
    const verifier = new TurnstileCaptchaVerifier(
      buildConfig({ TURNSTILE_SECRET_KEY: "secret", NODE_ENV: "production" }),
    );

    await expect(verifier.verify("token")).resolves.toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("invalid-input-response"),
    );
  });

  it("retorna false, sem lançar, em caso de timeout/erro de rede", async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error("network error")) as unknown as typeof fetch;
    const verifier = new TurnstileCaptchaVerifier(
      buildConfig({ TURNSTILE_SECRET_KEY: "secret", NODE_ENV: "production" }),
    );

    await expect(verifier.verify("token")).resolves.toBe(false);
  });

  it("retorna true (bypass) quando o secret está ausente e TURNSTILE_DEV_BYPASS=true", async () => {
    const warnSpy = jest
      .spyOn(Logger.prototype, "warn")
      .mockImplementation(() => undefined);
    global.fetch = jest.fn() as unknown as typeof fetch;
    const verifier = new TurnstileCaptchaVerifier(
      buildConfig({
        TURNSTILE_SECRET_KEY: undefined,
        TURNSTILE_DEV_BYPASS: "true",
        NODE_ENV: "development",
      }),
    );

    await expect(verifier.verify("token")).resolves.toBe(true);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("retorna false (fail-closed) quando o secret está ausente e TURNSTILE_DEV_BYPASS não é 'true'", async () => {
    global.fetch = jest.fn() as unknown as typeof fetch;
    const verifier = new TurnstileCaptchaVerifier(
      buildConfig({
        TURNSTILE_SECRET_KEY: undefined,
        TURNSTILE_DEV_BYPASS: undefined,
        NODE_ENV: "production",
      }),
    );

    await expect(verifier.verify("token")).resolves.toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("retorna false (fail-closed) quando o secret está ausente e TURNSTILE_DEV_BYPASS não é 'true', independente de NODE_ENV não setado ou 'development'/'staging'", async () => {
    global.fetch = jest.fn() as unknown as typeof fetch;

    const verifierNoNodeEnv = new TurnstileCaptchaVerifier(
      buildConfig({ TURNSTILE_SECRET_KEY: undefined, NODE_ENV: undefined }),
    );
    await expect(verifierNoNodeEnv.verify("token")).resolves.toBe(false);

    const verifierDevelopment = new TurnstileCaptchaVerifier(
      buildConfig({
        TURNSTILE_SECRET_KEY: undefined,
        NODE_ENV: "development",
        TURNSTILE_DEV_BYPASS: "false",
      }),
    );
    await expect(verifierDevelopment.verify("token")).resolves.toBe(false);

    const verifierStaging = new TurnstileCaptchaVerifier(
      buildConfig({ TURNSTILE_SECRET_KEY: undefined, NODE_ENV: "staging" }),
    );
    await expect(verifierStaging.verify("token")).resolves.toBe(false);

    expect(global.fetch).not.toHaveBeenCalled();
  });
});
