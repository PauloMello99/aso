import { PdfKitMemberDocumentGenerator } from "./pdfkit-member-document.generator";
import {
  buildReceiptRows,
  formatBrl,
  formatIsoDateBr,
  formatReferencePeriod,
  reversedBanner,
} from "./member-document-format";
import type {
  ReceiptModel,
  ReportModel,
} from "../../domain/member-document.models";

function buildReceipt(overrides: Partial<ReceiptModel> = {}): ReceiptModel {
  return {
    studioName: "Estúdio Ink",
    memberName: "Ana Souza",
    memberEmail: "ana@example.com",
    amountCents: 123456,
    paidAt: new Date("2026-09-01T15:00:00Z"),
    periodStart: "2026-08-01",
    periodEnd: "2026-08-31",
    paymentMethod: "bank_transfer",
    description: "Pagamento a funcionário",
    paymentId: "12345678-aaaa-bbbb-cccc-000000000000",
    transactionId: "abcdef01-aaaa-bbbb-cccc-000000000000",
    issuedAt: new Date("2026-09-19T12:00:00Z"),
    reversed: false,
    reversedAt: null,
    ...overrides,
  };
}

function buildReport(): ReportModel {
  return {
    studioName: "Estúdio Ink",
    memberName: "Ana Souza",
    memberEmail: "ana@example.com",
    periodFrom: "2026-09-01",
    periodTo: "2026-09-30",
    issuedAt: new Date("2026-09-19T12:00:00Z"),
    servicesCount: 60,
    services: Array.from({ length: 60 }, (_, index) => ({
      performedAt: new Date("2026-09-05T15:00:00Z"),
      customerName: `Cliente ${index}`,
      serviceName: "Tatuagem",
      amountCents: 20000,
      paid: index % 2 === 0,
    })),
    payments: [
      {
        paidAt: new Date("2026-09-10T10:00:00Z"),
        amountCents: 3000,
        periodStart: null,
        periodEnd: null,
        reversed: true,
      },
    ],
    totals: {
      grossRevenueCents: 600000,
      feesCents: 10000,
      commissionCents: 300000,
      paidNetCents: 0,
      periodBalanceCents: 300000,
      studioShareCents: 290000,
    },
  };
}

describe("member-document-format", () => {
  it("formatBrl usa vírgula decimal, ponto de milhar e trata negativo", () => {
    expect(formatBrl(123456)).toBe("R$ 1.234,56");
    expect(formatBrl(5)).toBe("R$ 0,05");
    expect(formatBrl(0)).toBe("R$ 0,00");
    expect(formatBrl(-1000)).toBe("-R$ 10,00");
  });

  it("formatIsoDateBr não desloca o dia", () => {
    expect(formatIsoDateBr("2026-09-01")).toBe("01/09/2026");
  });

  it("formatReferencePeriod cobre ambos, um lado e nenhum", () => {
    expect(formatReferencePeriod("2026-08-01", "2026-08-31")).toBe(
      "01/08/2026 a 31/08/2026",
    );
    expect(formatReferencePeriod(null, null)).toBe("-");
  });

  it("buildReceiptRows traz os textos-chave do recibo", () => {
    const rows = Object.fromEntries(buildReceiptRows(buildReceipt()));

    expect(rows["Estúdio"]).toBe("Estúdio Ink");
    expect(rows["Profissional"]).toBe("Ana Souza (ana@example.com)");
    expect(rows["Valor"]).toBe("R$ 1.234,56");
    expect(rows["Método de pagamento"]).toBe("Transferência / Pix");
    expect(rows["Pagamento"]).toBe("12345678");
    expect(rows["Transação"]).toBe("abcdef01");
  });

  it("reversedBanner só aparece para pagamento estornado", () => {
    expect(reversedBanner(buildReceipt())).toBeNull();
    expect(
      reversedBanner(
        buildReceipt({ reversed: true, reversedAt: new Date("2026-09-10T15:00:00Z") }),
      ),
    ).toBe("ESTORNADO em 10/09/2026");
    expect(reversedBanner(buildReceipt({ reversed: true }))).toBe("ESTORNADO");
  });
});

describe("PdfKitMemberDocumentGenerator", () => {
  const generator = new PdfKitMemberDocumentGenerator();

  it("gera o recibo como PDF válido (%PDF ... %%EOF)", async () => {
    const buffer = await generator.generateReceipt(buildReceipt());

    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(buffer.subarray(-16).toString()).toContain("%%EOF");
  });

  it("gera o recibo de pagamento estornado", async () => {
    const buffer = await generator.generateReceipt(
      buildReceipt({ reversed: true, reversedAt: new Date() }),
    );

    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("gera o relatório com paginação (60 serviços) como PDF válido", async () => {
    const buffer = await generator.generateReport(buildReport());

    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(buffer.subarray(-16).toString()).toContain("%%EOF");
  });
});
