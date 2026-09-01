import { Logger } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { RunCampaignTriggersUseCase } from "./run-campaign-triggers.use-case";
import type { ICronJobStateRepository } from "../../../../common/cron/cron-job-state.repository.interface";
import type { ICampaignMailer } from "../../domain/campaign-mailer.port";
import type {
  ICampaignSendRepository,
  RetriableCampaignSend,
} from "../../domain/campaign-send.repository.interface";
import type {
  CampaignTarget,
  ICampaignTargetRepository,
} from "../../domain/campaign-target.repository.interface";
import type { ICustomerEmailPreferenceRepository } from "../../domain/customer-email-preference.repository.interface";

function buildConfig(
  overrides: Record<string, string | undefined> = {},
): ConfigService {
  const map: Record<string, string | undefined> = {
    CAMPAIGNS_ENABLED: "true",
    NOTIFICATIONS_EMAIL_ENABLED: "true",
    RESEND_API_KEY: "re_test_key",
    FRONTEND_URL: "https://app.example.com",
    ...overrides,
  };
  return {
    get: jest.fn((key: string, dflt?: string) => map[key] ?? dflt),
  } as unknown as ConfigService;
}

function buildTargetRepo(
  overrides: Partial<jest.Mocked<ICampaignTargetRepository>> = {},
): jest.Mocked<ICampaignTargetRepository> {
  return {
    findPostServiceTargets: jest.fn().mockResolvedValue([]),
    findBirthdayTargets: jest.fn().mockResolvedValue([]),
    findInactivityTargets: jest.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as jest.Mocked<ICampaignTargetRepository>;
}

function buildSendRepo(
  overrides: Partial<jest.Mocked<ICampaignSendRepository>> = {},
): jest.Mocked<ICampaignSendRepository> {
  return {
    record: jest.fn().mockResolvedValue(undefined),
    findRetriable: jest.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as jest.Mocked<ICampaignSendRepository>;
}

function buildPrefRepo(
  overrides: Partial<jest.Mocked<ICustomerEmailPreferenceRepository>> = {},
): jest.Mocked<ICustomerEmailPreferenceRepository> {
  return {
    ensureForCustomer: jest
      .fn()
      .mockResolvedValue({ unsubscribeToken: "tok-123" }),
    findByUnsubscribeToken: jest.fn(),
    unsubscribeAll: jest.fn(),
    unsubscribeTrigger: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ICustomerEmailPreferenceRepository>;
}

function buildMailer(
  overrides: Partial<jest.Mocked<ICampaignMailer>> = {},
): jest.Mocked<ICampaignMailer> {
  return {
    sendCampaign: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as jest.Mocked<ICampaignMailer>;
}

function buildCronJobStateRepo(
  overrides: Partial<jest.Mocked<ICronJobStateRepository>> = {},
): jest.Mocked<ICronJobStateRepository> {
  return {
    claimRun: jest.fn().mockResolvedValue(true),
    ...overrides,
  } as unknown as jest.Mocked<ICronJobStateRepository>;
}

function buildTarget(overrides: Partial<CampaignTarget> = {}): CampaignTarget {
  return {
    orgId: "org-1",
    orgName: "Studio X",
    customerId: "cus-1",
    customerName: "Ana",
    customerEmail: "ana@example.com",
    dedupeKey: "birthday:cus-1:2026",
    serviceId: null,
    subjectOverride: null,
    bodyOverride: null,
    ...overrides,
  };
}

function buildRetriable(
  overrides: Partial<RetriableCampaignSend> = {},
): RetriableCampaignSend {
  return {
    id: "snd-1",
    orgId: "org-1",
    customerId: "cus-9",
    trigger: "post_service",
    dedupeKey: "post_service:svc-9",
    attempt: 1,
    customerName: "Bruno",
    customerEmail: "bruno@example.com",
    orgName: "Studio X",
    subjectOverride: null,
    bodyOverride: null,
    ...overrides,
  };
}

interface Deps {
  config: ConfigService;
  targetRepo: jest.Mocked<ICampaignTargetRepository>;
  sendRepo: jest.Mocked<ICampaignSendRepository>;
  prefRepo: jest.Mocked<ICustomerEmailPreferenceRepository>;
  mailer: jest.Mocked<ICampaignMailer>;
  cronJobStateRepo: jest.Mocked<ICronJobStateRepository>;
}

function setup(overrides: Partial<Deps> = {}): Deps & {
  useCase: RunCampaignTriggersUseCase;
} {
  const deps: Deps = {
    config: overrides.config ?? buildConfig(),
    targetRepo: overrides.targetRepo ?? buildTargetRepo(),
    sendRepo: overrides.sendRepo ?? buildSendRepo(),
    prefRepo: overrides.prefRepo ?? buildPrefRepo(),
    mailer: overrides.mailer ?? buildMailer(),
    cronJobStateRepo: overrides.cronJobStateRepo ?? buildCronJobStateRepo(),
  };
  const useCase = new RunCampaignTriggersUseCase(
    deps.config,
    deps.targetRepo,
    deps.sendRepo,
    deps.prefRepo,
    deps.mailer,
    deps.cronJobStateRepo,
  );
  return { ...deps, useCase };
}

describe("RunCampaignTriggersUseCase", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("sai sem tocar nada quando CAMPAIGNS_ENABLED != 'true'", async () => {
    const { useCase, targetRepo, sendRepo, cronJobStateRepo } = setup({
      config: buildConfig({ CAMPAIGNS_ENABLED: "false" }),
    });

    const result = await useCase.execute();

    expect(result).toEqual({
      skipped: true,
      reason: "flag_disabled",
      sent: 0,
      failed: 0,
      retried: 0,
    });
    expect(targetRepo.findBirthdayTargets).not.toHaveBeenCalled();
    expect(sendRepo.record).not.toHaveBeenCalled();
    expect(cronJobStateRepo.claimRun).not.toHaveBeenCalled();
  });

  it("sai antes de reivindicar o tick quando o canal de e-mail está desligado", async () => {
    const { useCase, sendRepo, cronJobStateRepo } = setup({
      config: buildConfig({ NOTIFICATIONS_EMAIL_ENABLED: "false" }),
    });

    const result = await useCase.execute();

    expect(result.skipped).toBe(true);
    expect(result.reason).toBe("email_channel_disabled");
    expect(sendRepo.record).not.toHaveBeenCalled();
    expect(cronJobStateRepo.claimRun).not.toHaveBeenCalled();
  });

  it("sai quando o claim do self-throttle falha", async () => {
    const { useCase, sendRepo } = setup({
      cronJobStateRepo: buildCronJobStateRepo({
        claimRun: jest.fn().mockResolvedValue(false),
      }),
    });

    const result = await useCase.execute();

    expect(result.skipped).toBe(true);
    expect(result.reason).toBe("throttled");
    expect(sendRepo.record).not.toHaveBeenCalled();
  });

  it("caminho feliz: envia e grava uma linha 'sent' por alvo", async () => {
    const targetRepo = buildTargetRepo({
      findBirthdayTargets: jest
        .fn()
        .mockResolvedValue([
          buildTarget({ customerId: "cus-1", customerEmail: "a@x.com" }),
          buildTarget({ customerId: "cus-2", customerEmail: "b@x.com" }),
        ]),
    });
    const { useCase, prefRepo, mailer, sendRepo } = setup({ targetRepo });

    const result = await useCase.execute();

    expect(prefRepo.ensureForCustomer).toHaveBeenCalledTimes(2);
    expect(mailer.sendCampaign).toHaveBeenCalledTimes(2);
    expect(mailer.sendCampaign).toHaveBeenCalledWith(
      expect.objectContaining({ orgName: "Studio X", trigger: "birthday" }),
    );
    expect(sendRepo.record).toHaveBeenCalledTimes(2);
    expect(sendRepo.record).toHaveBeenCalledWith(
      expect.objectContaining({ attempt: 1, status: "sent", trigger: "birthday" }),
    );
    expect(result).toEqual({ skipped: false, sent: 2, failed: 0, retried: 0 });
  });

  it("um envio que lança não derruba o lote: grava 'failed' e segue", async () => {
    const targetRepo = buildTargetRepo({
      findBirthdayTargets: jest
        .fn()
        .mockResolvedValue([
          buildTarget({ customerId: "cus-1" }),
          buildTarget({ customerId: "cus-2" }),
          buildTarget({ customerId: "cus-3" }),
        ]),
    });
    const mailer = buildMailer({
      sendCampaign: jest
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("provider 500"))
        .mockResolvedValueOnce(undefined),
    });
    const { useCase, sendRepo } = setup({ targetRepo, mailer });

    const result = await useCase.execute();

    expect(sendRepo.record).toHaveBeenCalledTimes(3);
    expect(sendRepo.record).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: "cus-2",
        status: "failed",
        error: "provider 500",
      }),
    );
    expect(result).toEqual({ skipped: false, sent: 2, failed: 1, retried: 0 });
  });

  it("passa o assunto custom interpolado ao mailer quando há subjectOverride", async () => {
    const targetRepo = buildTargetRepo({
      findBirthdayTargets: jest.fn().mockResolvedValue([
        buildTarget({
          customerName: "Ana",
          subjectOverride: "Oi {{customerName}}",
        }),
      ]),
    });
    const { useCase, mailer } = setup({ targetRepo });

    await useCase.execute();

    expect(mailer.sendCampaign).toHaveBeenCalledWith(
      expect.objectContaining({ subject: "Oi Ana", orgName: "Studio X" }),
    );
  });

  it("passa o assunto default interpolado quando não há override", async () => {
    const targetRepo = buildTargetRepo({
      findBirthdayTargets: jest
        .fn()
        .mockResolvedValue([buildTarget({ customerName: "Ana" })]),
    });
    const { useCase, mailer } = setup({ targetRepo });

    await useCase.execute();

    expect(mailer.sendCampaign).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Feliz aniversário, Ana!",
        orgName: "Studio X",
      }),
    );
  });

  it("reenvia as linhas retriáveis com attempt + 1, ANTES do loop principal", async () => {
    const sendRepo = buildSendRepo({
      findRetriable: jest.fn().mockResolvedValue([buildRetriable({ attempt: 1 })]),
    });
    const targetRepo = buildTargetRepo({
      findBirthdayTargets: jest
        .fn()
        .mockResolvedValue([buildTarget({ customerId: "cus-1" })]),
    });
    const { useCase, mailer } = setup({ sendRepo, targetRepo });

    const result = await useCase.execute();

    expect(mailer.sendCampaign).toHaveBeenCalledTimes(2);
    // 1a chamada a record = o retry (attempt 2); só depois o alvo do loop.
    expect(sendRepo.record.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        dedupeKey: "post_service:svc-9",
        attempt: 2,
        status: "sent",
      }),
    );
    expect(sendRepo.record.mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        attempt: 1,
        status: "sent",
        trigger: "birthday",
      }),
    );
    expect(result).toEqual({ skipped: false, sent: 1, failed: 0, retried: 1 });
  });

  it("não grava 'failed' quando a entrega deu certo mas o registro 'sent' lança (Medium 1)", async () => {
    const targetRepo = buildTargetRepo({
      findBirthdayTargets: jest
        .fn()
        .mockResolvedValue([buildTarget({ customerId: "cus-1" })]),
    });
    const sendRepo = buildSendRepo({
      record: jest.fn().mockRejectedValueOnce(new Error("db indisponível")),
    });
    const warnSpy = jest
      .spyOn(Logger.prototype, "warn")
      .mockImplementation(() => undefined);
    const { useCase, mailer } = setup({ targetRepo, sendRepo });

    const result = await useCase.execute();

    expect(mailer.sendCampaign).toHaveBeenCalledTimes(1);
    expect(sendRepo.record).toHaveBeenCalledTimes(1);
    expect(sendRepo.record).not.toHaveBeenCalledWith(
      expect.objectContaining({ status: "failed" }),
    );
    expect(result).toEqual({ skipped: false, sent: 0, failed: 0, retried: 0 });
    expect(warnSpy).toHaveBeenCalled();
  });

  it("não propaga quando o record do caminho de falha lança; segue os próximos alvos (Medium 3)", async () => {
    const targetRepo = buildTargetRepo({
      findBirthdayTargets: jest.fn().mockResolvedValue([
        buildTarget({ customerId: "cus-1", customerEmail: "um@x.com" }),
        buildTarget({ customerId: "cus-2", customerEmail: "dois@x.com" }),
      ]),
    });
    const mailer = buildMailer({
      sendCampaign: jest
        .fn()
        .mockRejectedValueOnce(new Error("provider 500"))
        .mockResolvedValueOnce(undefined),
    });
    const sendRepo = buildSendRepo({
      record: jest
        .fn()
        .mockRejectedValueOnce(new Error("db indisponível"))
        .mockResolvedValue(undefined),
    });
    const warnSpy = jest
      .spyOn(Logger.prototype, "warn")
      .mockImplementation(() => undefined);
    const { useCase } = setup({ targetRepo, mailer, sendRepo });

    const result = await useCase.execute();

    // O 2o alvo é processado APÓS o record de falha do 1o ter lançado: prova
    // que a exceção não escapou de execute().
    expect(mailer.sendCampaign).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ to: "dois@x.com" }),
    );
    expect(sendRepo.record).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ skipped: false, sent: 1, failed: 1, retried: 0 });
    expect(warnSpy).toHaveBeenCalled();
  });

  it("redige o endereço de e-mail antes de gravar em campaign_sends.error (Low 2)", async () => {
    const targetRepo = buildTargetRepo({
      findBirthdayTargets: jest
        .fn()
        .mockResolvedValue([buildTarget({ customerId: "cus-1" })]),
    });
    const mailer = buildMailer({
      sendCampaign: jest
        .fn()
        .mockRejectedValue(new Error("bounce for ana@example.com (550)")),
    });
    const { useCase, sendRepo } = setup({ targetRepo, mailer });

    await useCase.execute();

    expect(sendRepo.record).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "failed",
        error: "bounce for [email redigido] (550)",
      }),
    );
  });

  it("loga warn quando um gatilho atinge o teto de alvos (Low 3)", async () => {
    const targets = Array.from({ length: 200 }, (_, i) =>
      buildTarget({
        customerId: `cus-${i}`,
        dedupeKey: `birthday:cus-${i}:2026`,
      }),
    );
    const targetRepo = buildTargetRepo({
      findBirthdayTargets: jest.fn().mockResolvedValue(targets),
    });
    const warnSpy = jest
      .spyOn(Logger.prototype, "warn")
      .mockImplementation(() => undefined);
    const { useCase } = setup({ targetRepo });

    const result = await useCase.execute();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Gatilho birthday atingiu o teto"),
    );
    expect(result.sent).toBe(200);
  });

  it("resolve referenceDate como um Date e o passa aos helpers de aniversário/inatividade", async () => {
    const { useCase, targetRepo } = setup();

    await useCase.execute();

    const birthdayArg = targetRepo.findBirthdayTargets.mock.calls[0]?.[0];
    expect(birthdayArg?.referenceDate).toBeInstanceOf(Date);
    const inactivityArg = targetRepo.findInactivityTargets.mock.calls[0]?.[0];
    expect(inactivityArg?.referenceDate).toBeInstanceOf(Date);
  });
});
