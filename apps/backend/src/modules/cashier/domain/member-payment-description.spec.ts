import {
  MEMBER_PAYMENT_DEFAULT_DESCRIPTION,
  buildMemberPaymentTransactionDescription,
} from "./member-payment-description";

describe("buildMemberPaymentTransactionDescription", () => {
  it("usa apenas o nome quando não há período nem nota", () => {
    expect(
      buildMemberPaymentTransactionDescription({
        beneficiaryName: "Maria Silva",
      }),
    ).toBe("Pagamento a Maria Silva");
  });

  it("acrescenta o período quando início e fim vêm juntos", () => {
    expect(
      buildMemberPaymentTransactionDescription({
        beneficiaryName: "Maria Silva",
        periodStart: "2026-09-01",
        periodEnd: "2026-09-15",
      }),
    ).toBe("Pagamento a Maria Silva (01/09/2026 a 15/09/2026)");
  });

  it("ignora o período parcial", () => {
    expect(
      buildMemberPaymentTransactionDescription({
        beneficiaryName: "Maria Silva",
        periodStart: "2026-09-01",
        periodEnd: null,
      }),
    ).toBe("Pagamento a Maria Silva");
    expect(
      buildMemberPaymentTransactionDescription({
        beneficiaryName: "Maria Silva",
        periodStart: null,
        periodEnd: "2026-09-15",
      }),
    ).toBe("Pagamento a Maria Silva");
  });

  it("acrescenta a nota do owner após o período", () => {
    expect(
      buildMemberPaymentTransactionDescription({
        beneficiaryName: "Maria Silva",
        periodStart: "2026-09-01",
        periodEnd: "2026-09-15",
        note: "Bônus",
      }),
    ).toBe("Pagamento a Maria Silva (01/09/2026 a 15/09/2026) — Bônus");
  });

  it("ignora a nota igual ao texto default", () => {
    expect(
      buildMemberPaymentTransactionDescription({
        beneficiaryName: "Maria Silva",
        note: MEMBER_PAYMENT_DEFAULT_DESCRIPTION,
      }),
    ).toBe("Pagamento a Maria Silva");
  });

  it("faz trim da nota e ignora nota só com espaços", () => {
    expect(
      buildMemberPaymentTransactionDescription({
        beneficiaryName: "Maria Silva",
        note: "  Bônus  ",
      }),
    ).toBe("Pagamento a Maria Silva — Bônus");
    expect(
      buildMemberPaymentTransactionDescription({
        beneficiaryName: "Maria Silva",
        note: "   ",
      }),
    ).toBe("Pagamento a Maria Silva");
  });

  it("usa o fallback 'funcionário' quando o nome é vazio ou só espaços", () => {
    expect(
      buildMemberPaymentTransactionDescription({ beneficiaryName: "" }),
    ).toBe("Pagamento a funcionário");
    expect(
      buildMemberPaymentTransactionDescription({ beneficiaryName: "   " }),
    ).toBe("Pagamento a funcionário");
  });

  it("não desloca a data para o dia anterior (sem new Date)", () => {
    expect(
      buildMemberPaymentTransactionDescription({
        beneficiaryName: "Maria Silva",
        periodStart: "2026-09-01",
        periodEnd: "2026-09-01",
      }),
    ).toBe("Pagamento a Maria Silva (01/09/2026 a 01/09/2026)");
  });
});
