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
