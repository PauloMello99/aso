import { ConfigService } from "@nestjs/config";
import { ICronJobStateRepository } from "../../../../common/cron/cron-job-state.repository.interface";
import { EmailAllowlistService } from "../../../mail/application/email-allowlist.service";
import { MailService } from "../../../mail/application/mail.service";
import { getNotifiableEntries } from "../../domain/changelog-entries";
import { ChangelogEntry } from "../../domain/changelog-entry";
import { IChangelogNotificationRepository } from "../../domain/changelog-notification.repository.interface";
import {
  ChangelogOwnerTarget,
  IChangelogTargetRepository,
} from "../../domain/changelog-target.repository.interface";
import {
  ANNOUNCEMENT_RECENCY_DAYS,
  SendChangelogAnnouncementsUseCase,
} from "./send-changelog-announcements.use-case";

// Relógio fixo do tick: o item padrão (publishedAt 2026-09-20) fica com 5 dias.
const NOW = new Date("2026-09-25T12:00:00Z");

// O seed real tem 0 itens notificáveis; o provedor é mockado por módulo.
jest.mock("../../domain/changelog-entries", () => ({
  getNotifiableEntries: jest.fn(),
}));

const mockedGetNotifiable = getNotifiableEntries as jest.MockedFunction<
  typeof getNotifiableEntries
>;

function buildFakeEntry(overrides: Partial<ChangelogEntry> = {}): ChangelogEntry {
  return {
    id: "entry-5",
    version: 5,
    title: "Novo recurso",
    summary: "Resumo do recurso.",
    highlights: ["Ponto A"],
    audience: "owners",
    publishedAt: "2026-09-20",
    semver: "1.1.0",
    ...overrides,
  };
}

function buildFakeTarget(
  overrides: Partial<ChangelogOwnerTarget> = {},
): ChangelogOwnerTarget {
  return {
    userId: "user-1",
    name: "Dono",
    email: "dono@example.com",
    ...overrides,
  };
}

interface Fakes {
  config: ConfigService;
  targetRepo: jest.Mocked<IChangelogTargetRepository>;
  notificationRepo: jest.Mocked<IChangelogNotificationRepository>;
  cronRepo: jest.Mocked<ICronJobStateRepository>;
  mail: jest.Mocked<Pick<MailService, "sendProductUpdate">>;
  allowlist: jest.Mocked<Pick<EmailAllowlistService, "isAllowed">>;
  useCase: SendChangelogAnnouncementsUseCase;
}

function buildSut(env: Record<string, string> = {}): Fakes {
  const values: Record<string, string> = {
    CHANGELOG_ANNOUNCEMENTS_ENABLED: "true",
    NOTIFICATIONS_EMAIL_ENABLED: "true",
    RESEND_API_KEY: "re_test",
    ...env,
  };
  const config = {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
  const targetRepo = {
    findOwnersToNotify: jest.fn().mockResolvedValue([buildFakeTarget()]),
  } as unknown as jest.Mocked<IChangelogTargetRepository>;
  const notificationRepo = {
    recordSent: jest.fn().mockResolvedValue(undefined),
    recordFailed: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<IChangelogNotificationRepository>;
  const cronRepo = {
    claimRun: jest.fn().mockResolvedValue(true),
  } as unknown as jest.Mocked<ICronJobStateRepository>;
  const mail = {
    sendProductUpdate: jest.fn().mockResolvedValue(true),
  } as unknown as jest.Mocked<Pick<MailService, "sendProductUpdate">>;
  const allowlist = {
    isAllowed: jest.fn().mockReturnValue(true),
  } as unknown as jest.Mocked<Pick<EmailAllowlistService, "isAllowed">>;
  const useCase = new SendChangelogAnnouncementsUseCase(
    config,
    targetRepo,
    notificationRepo,
    cronRepo,
    mail as unknown as MailService,
    allowlist as unknown as EmailAllowlistService,
  );
  return {
    config,
    targetRepo,
    notificationRepo,
    cronRepo,
    mail,
    allowlist,
    useCase,
  };
}

describe("SendChangelogAnnouncementsUseCase", () => {
  beforeEach(() => {
    mockedGetNotifiable.mockReturnValue([buildFakeEntry()]);
  });

  it("kill-switch off => skipped 'disabled' sem tocar em nada", async () => {
    const s = buildSut({ CHANGELOG_ANNOUNCEMENTS_ENABLED: "false" });
    const result = await s.useCase.execute(NOW);
    expect(result.skippedReason).toBe("disabled");
    expect(s.cronRepo.claimRun).not.toHaveBeenCalled();
    expect(s.mail.sendProductUpdate).not.toHaveBeenCalled();
  });

  it("canal de e-mail off (flag) => skipped 'email_channel_off' sem claim", async () => {
    const s = buildSut({ NOTIFICATIONS_EMAIL_ENABLED: "false" });
    const result = await s.useCase.execute(NOW);
    expect(result.skippedReason).toBe("email_channel_off");
    expect(s.cronRepo.claimRun).not.toHaveBeenCalled();
  });

  it("canal de e-mail off (sem RESEND_API_KEY) => skipped", async () => {
    const s = buildSut({ RESEND_API_KEY: "" });
    const result = await s.useCase.execute(NOW);
    expect(result.skippedReason).toBe("email_channel_off");
  });

  it("claimRun negado => skipped 'already_ran'", async () => {
    const s = buildSut();
    s.cronRepo.claimRun.mockResolvedValue(false);
    const result = await s.useCase.execute(NOW);
    expect(result.skippedReason).toBe("already_ran");
    expect(s.targetRepo.findOwnersToNotify).not.toHaveBeenCalled();
    expect(s.cronRepo.claimRun).toHaveBeenCalledWith(
      "changelog-announcements",
      expect.any(Date),
      expect.any(Number),
    );
  });

  it("sem itens notificáveis => 0 chamadas", async () => {
    mockedGetNotifiable.mockReturnValue([]);
    const s = buildSut();
    const result = await s.useCase.execute(NOW);
    expect(result).toEqual({
      entriesProcessed: 0,
      sent: 0,
      failed: 0,
      blocked: 0,
    });
    expect(s.targetRepo.findOwnersToNotify).not.toHaveBeenCalled();
    expect(s.mail.sendProductUpdate).not.toHaveBeenCalled();
  });

  it("item MINOR notificável => 1 envio + recordSent por alvo", async () => {
    const s = buildSut();
    const result = await s.useCase.execute(NOW);
    expect(s.targetRepo.findOwnersToNotify).toHaveBeenCalledWith(
      "entry-5",
      "2026-09-20",
      500,
    );
    expect(s.mail.sendProductUpdate).toHaveBeenCalledWith({
      to: "dono@example.com",
      name: "Dono",
      semver: "1.1.0",
      title: "Novo recurso",
      summary: "Resumo do recurso.",
      highlights: ["Ponto A"],
    });
    expect(s.notificationRepo.recordSent).toHaveBeenCalledWith(
      "user-1",
      "entry-5",
    );
    expect(result).toEqual({
      entriesProcessed: 1,
      sent: 1,
      failed: 0,
      blocked: 0,
    });
  });

  describe("janela de recência", () => {
    it("expõe 30 dias como política", () => {
      expect(ANNOUNCEMENT_RECENCY_DAYS).toBe(30);
    });

    it("item dentro da janela => processa", async () => {
      mockedGetNotifiable.mockReturnValue([
        buildFakeEntry({ publishedAt: "2026-09-01" }),
      ]);
      const s = buildSut();
      const result = await s.useCase.execute(NOW);
      expect(result.entriesProcessed).toBe(1);
      expect(s.targetRepo.findOwnersToNotify).toHaveBeenCalledTimes(1);
    });

    it("borda: exatamente 30 dias => processa", async () => {
      mockedGetNotifiable.mockReturnValue([
        buildFakeEntry({ publishedAt: "2026-08-26" }),
      ]);
      const s = buildSut();
      const result = await s.useCase.execute(new Date("2026-09-25T00:00:00Z"));
      expect(result.entriesProcessed).toBe(1);
    });

    it("item com mais de 30 dias => nunca processa", async () => {
      mockedGetNotifiable.mockReturnValue([
        buildFakeEntry({ publishedAt: "2026-08-25" }),
      ]);
      const s = buildSut();
      const result = await s.useCase.execute(new Date("2026-09-25T00:00:00Z"));
      expect(result).toEqual({
        entriesProcessed: 0,
        sent: 0,
        failed: 0,
        blocked: 0,
      });
      expect(s.targetRepo.findOwnersToNotify).not.toHaveBeenCalled();
      expect(s.mail.sendProductUpdate).not.toHaveBeenCalled();
    });

    it("mistura: só o item recente é processado", async () => {
      mockedGetNotifiable.mockReturnValue([
        buildFakeEntry({ id: "old", version: 5, publishedAt: "2026-07-01" }),
        buildFakeEntry({ id: "new", version: 6, publishedAt: "2026-09-20" }),
      ]);
      const s = buildSut();
      await s.useCase.execute(NOW);
      expect(s.targetRepo.findOwnersToNotify).toHaveBeenCalledTimes(1);
      expect(s.targetRepo.findOwnersToNotify).toHaveBeenCalledWith(
        "new",
        "2026-09-20",
        500,
      );
    });
  });

  it("allowlist bloqueia => zero envio e zero linha", async () => {
    const s = buildSut();
    s.allowlist.isAllowed.mockReturnValue(false);
    const result = await s.useCase.execute(NOW);
    expect(s.mail.sendProductUpdate).not.toHaveBeenCalled();
    expect(s.notificationRepo.recordSent).not.toHaveBeenCalled();
    expect(s.notificationRepo.recordFailed).not.toHaveBeenCalled();
    expect(result.blocked).toBe(1);
    expect(result.sent).toBe(0);
  });

  it("sender retorna false => recordFailed com erro redigido", async () => {
    const s = buildSut();
    s.mail.sendProductUpdate.mockResolvedValue(false);
    const result = await s.useCase.execute(NOW);
    expect(s.notificationRepo.recordSent).not.toHaveBeenCalled();
    expect(s.notificationRepo.recordFailed).toHaveBeenCalledWith(
      "user-1",
      "entry-5",
      "send_returned_false",
    );
    expect(result.failed).toBe(1);
  });

  it("sender lança com e-mail no texto => recordFailed só com a classe e o tick segue", async () => {
    const s = buildSut();
    s.targetRepo.findOwnersToNotify.mockResolvedValue([
      buildFakeTarget({ userId: "user-1" }),
      buildFakeTarget({ userId: "user-2", email: "outro@example.com" }),
    ]);
    s.mail.sendProductUpdate
      .mockRejectedValueOnce(new Error("rejected dono@example.com by provider"))
      .mockResolvedValueOnce(true);
    const result = await s.useCase.execute(NOW);
    expect(s.notificationRepo.recordFailed).toHaveBeenCalledWith(
      "user-1",
      "entry-5",
      "provider_error",
    );
    expect(s.notificationRepo.recordSent).toHaveBeenCalledWith(
      "user-2",
      "entry-5",
    );
    expect(result.failed).toBe(1);
    expect(result.sent).toBe(1);
  });

  it("mais de 50 bloqueados antes de um permitido => o permitido é alcançado", async () => {
    const s = buildSut();
    const blockedTargets = Array.from({ length: 60 }, (_, i) =>
      buildFakeTarget({ userId: `b-${i}`, email: `blocked${i}@example.com` }),
    );
    const allowed = buildFakeTarget({
      userId: "ok-1",
      email: "permitido@example.com",
    });
    s.targetRepo.findOwnersToNotify.mockResolvedValue([
      ...blockedTargets,
      allowed,
    ]);
    s.allowlist.isAllowed.mockImplementation(
      (email: string) => email === "permitido@example.com",
    );
    const result = await s.useCase.execute(NOW);
    expect(s.targetRepo.findOwnersToNotify).toHaveBeenCalledWith(
      "entry-5",
      "2026-09-20",
      500,
    );
    expect(s.mail.sendProductUpdate).toHaveBeenCalledTimes(1);
    expect(s.notificationRepo.recordSent).toHaveBeenCalledWith(
      "ok-1",
      "entry-5",
    );
    expect(result.blocked).toBe(60);
    expect(result.sent).toBe(1);
  });

  it("bloqueados não consomem o cap: 50 envios após 100 bloqueados, resto fica", async () => {
    const s = buildSut();
    const blockedTargets = Array.from({ length: 100 }, (_, i) =>
      buildFakeTarget({ userId: `b-${i}`, email: `blocked${i}@example.com` }),
    );
    const allowedTargets = Array.from({ length: 70 }, (_, i) =>
      buildFakeTarget({ userId: `ok-${i}`, email: `ok${i}@allowed.test` }),
    );
    s.targetRepo.findOwnersToNotify.mockResolvedValue([
      ...blockedTargets,
      ...allowedTargets,
    ]);
    s.allowlist.isAllowed.mockImplementation((email: string) =>
      email.endsWith("@allowed.test"),
    );
    const result = await s.useCase.execute(NOW);
    expect(result.blocked).toBe(100);
    expect(result.sent).toBe(50);
    expect(s.mail.sendProductUpdate).toHaveBeenCalledTimes(50);
  });

  it("respeita o cap por tick e não busca o item seguinte", async () => {
    mockedGetNotifiable.mockReturnValue([
      buildFakeEntry({ id: "entry-5", version: 5 }),
      buildFakeEntry({ id: "entry-6", version: 6, semver: "1.2.0" }),
    ]);
    const s = buildSut();
    const many = Array.from({ length: 50 }, (_, i) =>
      buildFakeTarget({ userId: `u-${i}`, email: `u${i}@example.com` }),
    );
    s.targetRepo.findOwnersToNotify.mockResolvedValueOnce(many);
    const result = await s.useCase.execute(NOW);
    expect(result.sent).toBe(50);
    expect(result.entriesProcessed).toBe(1);
    expect(s.targetRepo.findOwnersToNotify).toHaveBeenCalledTimes(1);
    expect(s.mail.sendProductUpdate).toHaveBeenCalledTimes(50);
  });

  it("cap também trunca uma lista maior que o limite", async () => {
    const s = buildSut();
    const many = Array.from({ length: 60 }, (_, i) =>
      buildFakeTarget({ userId: `u-${i}`, email: `u${i}@example.com` }),
    );
    s.targetRepo.findOwnersToNotify.mockResolvedValue(many);
    const result = await s.useCase.execute(NOW);
    expect(result.sent).toBe(50);
    expect(s.mail.sendProductUpdate).toHaveBeenCalledTimes(50);
  });

  it("erro ao gravar o log não derruba o tick", async () => {
    const s = buildSut();
    s.targetRepo.findOwnersToNotify.mockResolvedValue([
      buildFakeTarget({ userId: "user-1" }),
      buildFakeTarget({ userId: "user-2", email: "outro@example.com" }),
    ]);
    s.notificationRepo.recordSent
      .mockRejectedValueOnce(new Error("db down"))
      .mockResolvedValueOnce(undefined);
    const result = await s.useCase.execute(NOW);
    expect(s.mail.sendProductUpdate).toHaveBeenCalledTimes(2);
    expect(s.notificationRepo.recordSent).toHaveBeenCalledTimes(2);
    expect(result.sent).toBe(2);
  });
});
