import { Logger } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { ResendEmailSender } from "./resend-email-sender";
import type { EmailAllowlistService } from "../application/email-allowlist.service";

const send = jest.fn();

jest.mock("resend", () => ({
  Resend: jest.fn(() => ({
    emails: { send },
  })),
}));

function buildConfig(env: Record<string, string | undefined>): ConfigService {
  return {
    get: jest.fn((key: string) => env[key]),
  } as unknown as ConfigService;
}

function buildAllowlist(isAllowed: boolean): EmailAllowlistService {
  return {
    isAllowed: jest.fn().mockReturnValue(isAllowed),
  } as unknown as EmailAllowlistService;
}

const enabledConfig = buildConfig({
  NOTIFICATIONS_EMAIL_ENABLED: "true",
  RESEND_API_KEY: "re_fake_key_for_test",
});

describe("ResendEmailSender — gate da allowlist", () => {
  it("bloqueia e retorna false sem chamar o provedor quando a allowlist recusa", async () => {
    const allowlist = buildAllowlist(false);
    const sender = new ResendEmailSender(enabledConfig, allowlist);

    const result = await sender.send({
      to: "cliente-real@example.com",
      subject: "Assunto de teste",
      html: "<p>corpo</p>",
    });

    expect(result).toBe(false);
    expect(allowlist.isAllowed).toHaveBeenCalledWith(
      "cliente-real@example.com",
    );
  });

  it("não bloqueia quando o canal já está desabilitado (gate de flag continua primeiro)", async () => {
    const allowlist = buildAllowlist(false);
    const sender = new ResendEmailSender(
      buildConfig({ NOTIFICATIONS_EMAIL_ENABLED: "false" }),
      allowlist,
    );

    const result = await sender.send({
      to: "cliente-real@example.com",
      subject: "Assunto de teste",
      html: "<p>corpo</p>",
    });

    expect(result).toBe(false);
    expect(allowlist.isAllowed).not.toHaveBeenCalled();
  });
});

describe("ResendEmailSender — logs sem PII", () => {
  beforeEach(() => {
    send.mockReset();
  });

  it("log de falha e de sucesso citam só o domínio do destinatário", async () => {
    const errorSpy = jest
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => undefined);
    const debugSpy = jest
      .spyOn(Logger.prototype, "debug")
      .mockImplementation(() => undefined);
    const sender = new ResendEmailSender(enabledConfig, buildAllowlist(true));
    const input = {
      to: "cliente-real@example.com",
      subject: "Assunto de teste",
      html: "<p>corpo</p>",
    };

    send.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    await expect(sender.send(input)).rejects.toThrow();
    send.mockResolvedValueOnce({ data: { id: "email-id" }, error: null });
    await sender.send(input);

    const logged = [...errorSpy.mock.calls, ...debugSpy.mock.calls]
      .flat()
      .join("\n");
    errorSpy.mockRestore();
    debugSpy.mockRestore();
    expect(logged).toContain("@example.com");
    expect(logged).not.toContain("cliente-real");
  });
});

describe("ResendEmailSender — mapeamento de tags", () => {
  beforeEach(() => {
    send.mockReset();
    send.mockResolvedValue({ data: { id: "email-id" }, error: null });
  });

  it("converte input.tags (Record) para o formato {name, value}[] esperado pelo SDK", async () => {
    const allowlist = buildAllowlist(true);
    const sender = new ResendEmailSender(enabledConfig, allowlist);

    await sender.send({
      to: "cliente-real@example.com",
      subject: "Assunto de teste",
      html: "<p>corpo</p>",
      tags: { campaign_send_id: "abc-123" },
    });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: [{ name: "campaign_send_id", value: "abc-123" }],
      }),
    );
  });

  it("não envia a chave tags ao SDK quando input.tags não é informado", async () => {
    const allowlist = buildAllowlist(true);
    const sender = new ResendEmailSender(enabledConfig, allowlist);

    await sender.send({
      to: "cliente-real@example.com",
      subject: "Assunto de teste",
      html: "<p>corpo</p>",
    });

    const callArg = send.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(callArg.tags).toBeUndefined();
  });
});
