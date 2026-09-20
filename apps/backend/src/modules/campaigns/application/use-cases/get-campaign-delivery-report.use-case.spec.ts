import type {
  CampaignDeliveryReportRow,
  ICampaignDeliveryReportRepository,
} from "../../domain/campaign-delivery-report.repository.interface";
import { GetCampaignDeliveryReportUseCase } from "./get-campaign-delivery-report.use-case";

function buildFakeRow(
  overrides: Partial<CampaignDeliveryReportRow> = {},
): CampaignDeliveryReportRow {
  return {
    id: "send-1",
    customerId: "customer-1",
    customerName: "Cliente Um",
    customerEmail: "cliente@example.com",
    trigger: "post_service",
    status: "sent",
    attempt: 1,
    error: null,
    sentAt: new Date("2026-01-01T12:00:00.000Z"),
    createdAt: new Date("2026-01-01T12:00:00.000Z"),
    ...overrides,
  };
}

function buildReportRepo(
  overrides: Partial<jest.Mocked<ICampaignDeliveryReportRepository>> = {},
): jest.Mocked<ICampaignDeliveryReportRepository> {
  return {
    findDeliveryReport: jest.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as jest.Mocked<ICampaignDeliveryReportRepository>;
}

describe("GetCampaignDeliveryReportUseCase", () => {
  it("agrega o summary a partir de uma lista mista de status", async () => {
    const rows = [
      buildFakeRow({ id: "s1", status: "sent" }),
      buildFakeRow({ id: "s2", status: "sent" }),
      buildFakeRow({ id: "f1", status: "failed" }),
      buildFakeRow({ id: "b1", status: "bounced" }),
    ];
    const reportRepo = buildReportRepo({
      findDeliveryReport: jest.fn().mockResolvedValue(rows),
    });
    const useCase = new GetCampaignDeliveryReportUseCase(reportRepo);

    const result = await useCase.execute("org-1");

    expect(result.summary).toEqual({ sent: 2, failed: 1, bounced: 1 });
    expect(result.items).toEqual(rows);
  });

  it("lista vazia: summary zerado e items vazio", async () => {
    const reportRepo = buildReportRepo();
    const useCase = new GetCampaignDeliveryReportUseCase(reportRepo);

    const result = await useCase.execute("org-1");

    expect(result.summary).toEqual({ sent: 0, failed: 0, bounced: 0 });
    expect(result.items).toEqual([]);
  });

  it("linha com cliente removido (customerName/customerEmail null) é preservada intacta", async () => {
    const orphanRow = buildFakeRow({
      id: "s3",
      customerName: null,
      customerEmail: null,
    });
    const reportRepo = buildReportRepo({
      findDeliveryReport: jest.fn().mockResolvedValue([orphanRow]),
    });
    const useCase = new GetCampaignDeliveryReportUseCase(reportRepo);

    const result = await useCase.execute("org-1");

    expect(result.items).toEqual([orphanRow]);
    expect(result.items[0]!.customerName).toBeNull();
    expect(result.items[0]!.customerEmail).toBeNull();
  });

  it("envio devolvido (repositório já omite a sent): 1 item bounced, summary {sent:0,bounced:1}", async () => {
    const rows = [
      buildFakeRow({ id: "b1", status: "bounced", error: "Permanent/General" }),
    ];
    const reportRepo = buildReportRepo({
      findDeliveryReport: jest.fn().mockResolvedValue(rows),
    });
    const useCase = new GetCampaignDeliveryReportUseCase(reportRepo);

    const result = await useCase.execute("org-1");

    expect(result.summary).toEqual({ sent: 0, failed: 0, bounced: 1 });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.status).toBe("bounced");
  });

  it("sent sem bounce vira sent; failed vira failed", async () => {
    const reportRepo = buildReportRepo({
      findDeliveryReport: jest
        .fn()
        .mockResolvedValue([
          buildFakeRow({ id: "s1", status: "sent" }),
          buildFakeRow({ id: "f1", status: "failed", error: "boom" }),
        ]),
    });
    const useCase = new GetCampaignDeliveryReportUseCase(reportRepo);

    const result = await useCase.execute("org-1");

    expect(result.summary).toEqual({ sent: 1, failed: 1, bounced: 0 });
  });

  it("redige e-mail no campo error na leitura (linha crua no banco) e preserva null", async () => {
    const reportRepo = buildReportRepo({
      findDeliveryReport: jest.fn().mockResolvedValue([
        buildFakeRow({
          id: "b1",
          status: "bounced",
          error: "Permanent: atacante@evil.com rejected",
        }),
        buildFakeRow({ id: "s1", status: "sent", error: null }),
      ]),
    });
    const useCase = new GetCampaignDeliveryReportUseCase(reportRepo);

    const result = await useCase.execute("org-1");

    expect(result.items[0]!.error).toBe(
      "Permanent: [email redigido] rejected",
    );
    expect(result.items[1]!.error).toBeNull();
  });

  it("chama o repositório com o orgId recebido e limit=200", async () => {
    const reportRepo = buildReportRepo();
    const useCase = new GetCampaignDeliveryReportUseCase(reportRepo);

    await useCase.execute("org-42");

    expect(reportRepo.findDeliveryReport).toHaveBeenCalledWith("org-42", 200);
  });
});
