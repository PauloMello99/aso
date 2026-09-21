import type { ConfigService } from "@nestjs/config";
import { registerPostCommit } from "../../../database/database.module";
import { NotificationService } from "../../notifications/application/notification.service";
import { IStockVerificationRepository } from "../domain/stock-verification.repository.interface";
import { LowStockAlertService, LowStockItem } from "./low-stock-alert.service";

jest.mock("../../../database/database.module", () => ({
  registerPostCommit: jest.fn(),
}));

const registerPostCommitMock = registerPostCommit as jest.MockedFunction<
  typeof registerPostCommit
>;

function buildItem(overrides: Partial<LowStockItem> = {}): LowStockItem {
  return {
    id: "mat-1",
    name: "Tinta preta",
    stockQuantity: "2",
    minimumQuantity: "5",
    ...overrides,
  };
}

function buildFakeStockVerificationRepo(
  overrides: Partial<jest.Mocked<IStockVerificationRepository>> = {},
): jest.Mocked<IStockVerificationRepository> {
  return {
    findOwnerUserIds: jest.fn().mockResolvedValue(["owner-1", "owner-2"]),
    findOrgSlug: jest.fn().mockResolvedValue("minha-org"),
    ...overrides,
  } as unknown as jest.Mocked<IStockVerificationRepository>;
}

// `null` = FRONTEND_URL ausente (um `undefined` explicito cairia no default).
function buildFakeConfig(frontendUrl: string | null = "https://app.test") {
  return {
    get: jest.fn().mockReturnValue(frontendUrl ?? undefined),
  } as unknown as ConfigService;
}

function buildFakeNotifications(
  overrides: Partial<jest.Mocked<NotificationService>> = {},
): jest.Mocked<NotificationService> {
  return {
    notify: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as jest.Mocked<NotificationService>;
}

async function runPostCommitHooks(): Promise<void> {
  for (const [hook] of registerPostCommitMock.mock.calls) {
    void hook();
  }
  // o dispatch e destacado (nao awaited pelo hook): drena a fila de microtasks
  await new Promise((resolve) => setImmediate(resolve));
}

describe("LowStockAlertService", () => {
  beforeEach(() => {
    registerPostCommitMock.mockReset();
  });

  it("nao registra hook nem notifica quando a lista esta vazia", async () => {
    const repo = buildFakeStockVerificationRepo();
    const notifications = buildFakeNotifications();
    const service = new LowStockAlertService(
      repo,
      notifications,
      buildFakeConfig(),
    );

    service.scheduleIfAny("org-1", []);
    await runPostCommitHooks();

    expect(registerPostCommitMock).not.toHaveBeenCalled();
    expect(repo.findOwnerUserIds).not.toHaveBeenCalled();
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it("usa titulo singular com 1 material", async () => {
    const repo = buildFakeStockVerificationRepo({
      findOwnerUserIds: jest.fn().mockResolvedValue(["owner-1"]),
    });
    const notifications = buildFakeNotifications();
    const service = new LowStockAlertService(
      repo,
      notifications,
      buildFakeConfig(),
    );

    service.scheduleIfAny("org-1", [buildItem()]);
    expect(notifications.notify).not.toHaveBeenCalled();
    await runPostCommitHooks();

    expect(notifications.notify).toHaveBeenCalledTimes(1);
    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "owner-1",
        orgId: "org-1",
        type: "low_stock",
        title: "Estoque baixo: Tinta preta",
      }),
    );
  });

  it("envia 1 notify por dono com titulo plural para 3 materiais", async () => {
    const repo = buildFakeStockVerificationRepo();
    const notifications = buildFakeNotifications();
    const service = new LowStockAlertService(
      repo,
      notifications,
      buildFakeConfig(),
    );

    service.scheduleIfAny("org-1", [
      buildItem({ id: "m1", name: "A" }),
      buildItem({ id: "m2", name: "B" }),
      buildItem({ id: "m3", name: "C" }),
    ]);
    await runPostCommitHooks();

    expect(notifications.notify).toHaveBeenCalledTimes(2);
    for (const [input] of notifications.notify.mock.calls) {
      expect(input.title).toBe("3 materiais abaixo do mínimo");
      expect(input.type).toBe("low_stock");
    }
  });

  it("une os materiais numa linha com ' · ' e inclui o link 'Ver estoque'", async () => {
    const repo = buildFakeStockVerificationRepo({
      findOwnerUserIds: jest.fn().mockResolvedValue(["owner-1"]),
    });
    const notifications = buildFakeNotifications();
    const service = new LowStockAlertService(
      repo,
      notifications,
      buildFakeConfig("https://app.test/"),
    );

    service.scheduleIfAny("org-1", [
      buildItem({ id: "m1", name: "A", stockQuantity: "1", minimumQuantity: "3" }),
      buildItem({ id: "m2", name: "B", stockQuantity: "0", minimumQuantity: "2" }),
    ]);
    await runPostCommitHooks();

    expect(repo.findOrgSlug).toHaveBeenCalledWith("org-1");
    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        body: "A: atual 1, mínimo 3 · B: atual 0, mínimo 2",
        actionUrl: "https://app.test/dashboard/org/minha-org/stock",
        actionLabel: "Ver estoque",
      }),
    );
  });

  it("omite o link sem FRONTEND_URL, sem slug ou se o slug falhar, mas ainda notifica", async () => {
    const cases: Array<[ConfigService, Partial<jest.Mocked<IStockVerificationRepository>>]> = [
      [buildFakeConfig(null), {}],
      [buildFakeConfig(), { findOrgSlug: jest.fn().mockResolvedValue(null) }],
      [buildFakeConfig(), { findOrgSlug: jest.fn().mockRejectedValue(new Error("x")) }],
    ];
    for (const [config, overrides] of cases) {
      registerPostCommitMock.mockReset();
      const notifications = buildFakeNotifications();
      const repo = buildFakeStockVerificationRepo({
        findOwnerUserIds: jest.fn().mockResolvedValue(["owner-1"]),
        ...overrides,
      });
      new LowStockAlertService(repo, notifications, config).scheduleIfAny(
        "org-1",
        [buildItem()],
      );
      await runPostCommitHooks();

      expect(notifications.notify).toHaveBeenCalledTimes(1);
      const [input] = notifications.notify.mock.calls[0]!;
      expect(input.actionUrl).toBeUndefined();
      expect(input.actionLabel).toBeUndefined();
    }
  });

  it("nao propaga erro do notify e continua nos demais donos", async () => {
    const repo = buildFakeStockVerificationRepo();
    const notifications = buildFakeNotifications({
      notify: jest
        .fn()
        .mockRejectedValueOnce(new Error("boom"))
        .mockResolvedValue(undefined),
    });
    const service = new LowStockAlertService(
      repo,
      notifications,
      buildFakeConfig(),
    );

    service.scheduleIfAny("org-1", [buildItem()]);
    await expect(runPostCommitHooks()).resolves.toBeUndefined();

    expect(notifications.notify).toHaveBeenCalledTimes(2);
  });
});
