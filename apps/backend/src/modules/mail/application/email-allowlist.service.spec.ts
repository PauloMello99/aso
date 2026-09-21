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

  it.each(["Production", "producton", "prod"])(
    "lança no construtor para APP_ENVIRONMENT desconhecido (%s)",
    (value) => {
      expect(
        () =>
          new EmailAllowlistService(
            buildConfig({ APP_ENVIRONMENT: value, EMAIL_ALLOWLIST: "" }),
          ),
      ).toThrow(/APP_ENVIRONMENT inválido.*production, staging, development, test/);
    },
  );

  it.each(["production", "staging", "development", "test"])(
    "aceita o valor válido %s sem lançar",
    (value) => {
      expect(
        () =>
          new EmailAllowlistService(
            buildConfig({
              APP_ENVIRONMENT: value,
              EMAIL_ALLOWLIST: "dev@example.com",
            }),
          ),
      ).not.toThrow();
    },
  );

  it("APP_ENVIRONMENT ausente: enforcing sem lançar e com warn", () => {
    const warnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation();
    const logSpy = jest.spyOn(Logger.prototype, "log").mockImplementation();

    const service = new EmailAllowlistService(
      buildConfig({
        APP_ENVIRONMENT: undefined,
        EMAIL_ALLOWLIST: "dev@example.com",
      }),
    );

    expect(service.isAllowed("outro@example.com")).toBe(false);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toContain("APP_ENVIRONMENT não definido");

    warnSpy.mockRestore();
    logSpy.mockRestore();
  });

  it("APP_ENVIRONMENT vazio/espaços: enforcing sem lançar", () => {
    const warnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation();
    const logSpy = jest.spyOn(Logger.prototype, "log").mockImplementation();

    const service = new EmailAllowlistService(
      buildConfig({ APP_ENVIRONMENT: "  ", EMAIL_ALLOWLIST: "dev@example.com" }),
    );

    expect(service.isAllowed("outro@example.com")).toBe(false);

    warnSpy.mockRestore();
    logSpy.mockRestore();
  });

  it("enforcing com allowlist vazia emite warn destacando bloqueio total", () => {
    const warnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation();
    const logSpy = jest.spyOn(Logger.prototype, "log").mockImplementation();

    new EmailAllowlistService(
      buildConfig({ APP_ENVIRONMENT: "staging", EMAIL_ALLOWLIST: "" }),
    );

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toContain("TODO e-mail está bloqueado");

    warnSpy.mockRestore();
    logSpy.mockRestore();
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
