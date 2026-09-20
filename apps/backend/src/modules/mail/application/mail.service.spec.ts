import type { ConfigService } from "@nestjs/config";
import { MailService } from "./mail.service";
import type {
  CampaignTriggerName,
  SendCampaignByTriggerInput,
} from "./mail.service";
import type {
  IEmailSender,
  SendEmailInput,
} from "../domain/ports/email-sender.port";

const TRIGGERS: readonly CampaignTriggerName[] = [
  "post_service",
  "birthday",
  "inactivity",
];

function buildSender(): jest.Mocked<IEmailSender> {
  return {
    send: jest.fn().mockResolvedValue(true),
  } as unknown as jest.Mocked<IEmailSender>;
}

function buildConfig(): ConfigService {
  return {
    get: jest.fn(() => undefined),
  } as unknown as ConfigService;
}

function firstSendArg(sender: jest.Mocked<IEmailSender>): SendEmailInput {
  const arg = sender.send.mock.calls[0]?.[0];
  if (!arg) {
    throw new Error("IEmailSender.send não foi chamado");
  }
  return arg;
}

const baseInput: Omit<SendCampaignByTriggerInput, "trigger"> = {
  to: "cliente@example.com",
  subject: "Assunto da campanha",
  body: {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "Primeiro parágrafo" }],
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: "Segundo parágrafo" }],
      },
    ],
  },
  customerName: "Cliente Teste",
  orgName: "Studio Helena",
  unsubscribeUrl: "https://app.example.com/preferencias-email/tok-abc",
};

describe("MailService.sendCampaignByTrigger", () => {
  it("renderiza o link de descadastro e o nome da org nos 3 gatilhos", async () => {
    for (const trigger of TRIGGERS) {
      const sender = buildSender();
      const service = new MailService(sender, buildConfig());

      await service.sendCampaignByTrigger({ ...baseInput, trigger });

      expect(sender.send).toHaveBeenCalledTimes(1);
      const { html } = firstSendArg(sender);
      expect(html).toContain(
        "https://app.example.com/preferencias-email/tok-abc",
      );
      expect(html).toContain("Não quero mais receber estes e-mails");
      expect(html).toContain("Studio Helena");
    }
  });

  it("escapa HTML do texto do corpo nos 3 gatilhos (anti-injection / LGPD)", async () => {
    for (const trigger of TRIGGERS) {
      const sender = buildSender();
      const service = new MailService(sender, buildConfig());

      await service.sendCampaignByTrigger({
        ...baseInput,
        trigger,
        body: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "<script>alert(1)</script>" }],
            },
          ],
        },
      });

      const { html } = firstSendArg(sender);
      expect(html).not.toContain("<script");
      expect(html).toContain("&lt;script");
    }
  });

  it("usa input.subject como assunto do envio, sem prefixo dinâmico", async () => {
    const sender = buildSender();
    const service = new MailService(sender, buildConfig());

    await service.sendCampaignByTrigger({
      ...baseInput,
      trigger: "birthday",
      subject: "Feliz aniversário, Ana!",
    });

    expect(firstSendArg(sender).subject).toBe("Feliz aniversário, Ana!");
  });

  it("substitui o rodapé padrão: campanha NÃO diz 'possui uma conta no ASO' nos 3 gatilhos", async () => {
    for (const trigger of TRIGGERS) {
      const sender = buildSender();
      const service = new MailService(sender, buildConfig());

      await service.sendCampaignByTrigger({ ...baseInput, trigger });

      const { html } = firstSendArg(sender);
      expect(html).not.toContain("possui uma conta no ASO");
    }
  });

  it("propaga input.tags até o sender quando informado", async () => {
    const sender = buildSender();
    const service = new MailService(sender, buildConfig());

    await service.sendCampaignByTrigger({
      ...baseInput,
      trigger: "birthday",
      tags: { campaign_send_id: "abc-123" },
    });

    expect(firstSendArg(sender).tags).toEqual({
      campaign_send_id: "abc-123",
    });
  });

  it("não envia tags ao sender quando input.tags não é informado (campo opcional, sem quebra)", async () => {
    const sender = buildSender();
    const service = new MailService(sender, buildConfig());

    await service.sendCampaignByTrigger({ ...baseInput, trigger: "birthday" });

    expect(firstSendArg(sender).tags).toBeUndefined();
  });
});

describe("MailService.sendProductUpdate", () => {
  const input = {
    to: "dono@example.com",
    name: "Paulo",
    semver: "1.4.0",
    title: "Changelog e avisos",
    summary: "Resumo da novidade.",
    highlights: ["Primeiro destaque", "Segundo destaque"],
  };

  function buildConfigWithUrl(): ConfigService {
    return {
      get: jest.fn((key: string) =>
        key === "FRONTEND_URL" ? "https://app.example.com/" : undefined,
      ),
    } as unknown as ConfigService;
  }

  it("envia com to/subject corretos e retorna o resultado do sender", async () => {
    const sender = buildSender();
    const service = new MailService(sender, buildConfigWithUrl());

    const result = await service.sendProductUpdate(input);

    expect(result).toBe(true);
    const sent = firstSendArg(sender);
    expect(sent.to).toBe("dono@example.com");
    expect(sent.subject).toBe("Novidades do ASO 1.4.0: Changelog e avisos");
    expect(sent.tags).toBeUndefined();
  });

  it("renderiza título, resumo, destaques, CTA e link de Minha Conta", async () => {
    const sender = buildSender();
    const service = new MailService(sender, buildConfigWithUrl());

    await service.sendProductUpdate(input);

    const { html } = firstSendArg(sender);
    expect(html).toContain("Novidades do ASO 1.4.0");
    expect(html).toContain("Resumo da novidade.");
    expect(html).toContain("Primeiro destaque");
    expect(html).toContain("Abrir o ASO");
    expect(html).toContain('href="https://app.example.com"');
    expect(html).toContain("https://app.example.com/dashboard/account");
    expect(html).toContain("Minha Conta");
  });

  it("omite CTA e lista quando não há FRONTEND_URL nem highlights", async () => {
    const sender = buildSender();
    const service = new MailService(sender, buildConfig());

    await service.sendProductUpdate({ ...input, highlights: undefined });

    const { html } = firstSendArg(sender);
    expect(html).not.toContain("Abrir o ASO");
    expect(html).not.toContain("<ul");
  });

  it("retorna false quando o sender falha (canal desligado/erro reportado)", async () => {
    const sender = buildSender();
    sender.send.mockResolvedValue(false);
    const service = new MailService(sender, buildConfigWithUrl());

    await expect(service.sendProductUpdate(input)).resolves.toBe(false);
  });
});

describe("MailService — rodapé padrão dos e-mails transacionais", () => {
  it("mantém o rodapé fixo ('possui uma conta no ASO') em e-mail transacional", async () => {
    const sender = buildSender();
    const service = new MailService(sender, buildConfig());

    await service.sendNotification({
      to: "membro@example.com",
      title: "Hora de conferir o estoque",
      body: "Já se passaram 30 dias desde a última conferência.",
    });

    const { html } = firstSendArg(sender);
    expect(html).toContain("possui uma conta no ASO");
  });
});
