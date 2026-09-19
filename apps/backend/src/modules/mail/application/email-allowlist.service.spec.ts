import type { ConfigService } from "@nestjs/config";
import { Logger } from "@nestjs/common";
import { EmailAllowlistService } from "./email-allowlist.service";
import { parseEmailAllowlist } from "../domain/email-allowlist";

function buildConfig(env: Record<string, string | undefined>): ConfigService {
  return {
    get: jest.fn((key: string) => env[key]),
  } as unknown as ConfigService;
}

describe("EmailAllowlistService", () => {
  it("permite qualquer destinatário quando APP_ENVIRONMENT=production", () => {
    const service = new EmailAllowlistService(
      buildConfig({ APP_ENVIRONMENT: "production", EMAIL_ALLOWLIST: "" }),
    );

    expect(service.isAllowed("cliente@example.com")).toBe(true);
  });

  it("permite destinatário presente na allowlist quando enforcing (não-produção)", () => {
    const service = new EmailAllowlistService(
      buildConfig({
        APP_ENVIRONMENT: "staging",
        EMAIL_ALLOWLIST: "dev@example.com, ana@example.com",
      }),
    );

    expect(service.isAllowed("ana@example.com")).toBe(true);
  });

  it("bloqueia destinatário fora da allowlist quando enforcing", () => {
    const service = new EmailAllowlistService(
      buildConfig({
        APP_ENVIRONMENT: "staging",
        EMAIL_ALLOWLIST: "dev@example.com",
      }),
    );

    expect(service.isAllowed("cliente-real@example.com")).toBe(false);
  });

  it("bloqueia QUALQUER destinatário quando enforcing e allowlist vazia", () => {
    const service = new EmailAllowlistService(
      buildConfig({ APP_ENVIRONMENT: "staging", EMAIL_ALLOWLIST: "" }),
    );

    expect(service.isAllowed("qualquer@example.com")).toBe(false);
  });

  it("trata APP_ENVIRONMENT ausente como enforcing (fail-safe por padrão)", () => {
    const service = new EmailAllowlistService(
      buildConfig({ APP_ENVIRONMENT: undefined, EMAIL_ALLOWLIST: "" }),
    );

    expect(service.isAllowed("qualquer@example.com")).toBe(false);
  });

  it("normaliza case do destinatário contra a allowlist já lowercased", () => {
    const service = new EmailAllowlistService(
      buildConfig({
        APP_ENVIRONMENT: "staging",
        EMAIL_ALLOWLIST: "ana@example.com",
      }),
    );

    expect(service.isAllowed("ANA@Example.com")).toBe(true);
  });

  it("loga o modo resolvido no boot sem nunca expor os e-mails da lista", () => {
    const logSpy = jest.spyOn(Logger.prototype, "log").mockImplementation();

    new EmailAllowlistService(
      buildConfig({
        APP_ENVIRONMENT: "staging",
        EMAIL_ALLOWLIST: "dev@example.com, ana@example.com",
      }),
    );

    expect(logSpy).toHaveBeenCalledTimes(1);
    const message = logSpy.mock.calls[0]?.[0] as string;
    expect(message).toContain("ENFORCING");
    expect(message).toContain("staging");
    expect(message).toContain("2 destinatário(s)");
    expect(message).not.toContain("dev@example.com");
    expect(message).not.toContain("ana@example.com");

    logSpy.mockRestore();
  });
});

describe("parseEmailAllowlist", () => {
  it("separa por vírgula, ponto-e-vírgula e espaço misturados", () => {
    expect(
      parseEmailAllowlist("dev@example.com,ana@example.com; joao@example.com joana@example.com"),
    ).toEqual([
      "dev@example.com",
      "ana@example.com",
      "joao@example.com",
      "joana@example.com",
    ]);
  });

  it("faz trim e lowercase de cada entrada", () => {
    expect(parseEmailAllowlist("  Dev@Example.com  ,ANA@EXAMPLE.COM")).toEqual(
      ["dev@example.com", "ana@example.com"],
    );
  });

  it("descarta entradas vazias geradas por separadores repetidos", () => {
    expect(parseEmailAllowlist("dev@example.com,, ;ana@example.com")).toEqual(
      ["dev@example.com", "ana@example.com"],
    );
  });

  it("retorna lista vazia para undefined ou string vazia", () => {
    expect(parseEmailAllowlist(undefined)).toEqual([]);
    expect(parseEmailAllowlist("")).toEqual([]);
  });
});
