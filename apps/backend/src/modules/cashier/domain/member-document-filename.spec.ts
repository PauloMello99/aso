import {
  receiptFilename,
  reportFilename,
  slugifyName,
} from "./member-document-filename";

describe("member-document-filename", () => {
  it("slugifyName remove acentos e pontuação", () => {
    expect(slugifyName("João  D'Ávila Jr.")).toBe("joao-d-avila-jr");
  });

  it("slugifyName cai em 'membro' quando não sobra nada", () => {
    expect(slugifyName("???")).toBe("membro");
  });

  it("receiptFilename usa a data de emissão AAAA-MM-DD e o id curto do pagamento", () => {
    expect(
      receiptFilename(
        "Ana Souza",
        new Date("2026-09-19T12:00:00Z"),
        "3f1e8c9a-1b2c-4d5e-8f90-1a2b3c4d5e6f",
      ),
    ).toBe("recibo-pagamento-ana-souza-2026-09-19-3f1e8c9a.pdf");
  });

  it("receiptFilename difere para dois pagamentos do mesmo dia", () => {
    const issuedAt = new Date("2026-09-19T12:00:00Z");
    expect(
      receiptFilename("Ana Souza", issuedAt, "aaaaaaaa-1b2c-4d5e-8f90-1a2b3c4d5e6f"),
    ).not.toBe(
      receiptFilename("Ana Souza", issuedAt, "bbbbbbbb-1b2c-4d5e-8f90-1a2b3c4d5e6f"),
    );
  });

  it("reportFilename usa slug e intervalo", () => {
    expect(reportFilename("Ana Souza", "2026-09-01", "2026-09-30")).toBe(
      "relatorio-ana-souza-2026-09-01-2026-09-30.pdf",
    );
  });
});
