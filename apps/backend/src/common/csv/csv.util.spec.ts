import { buildCsv, type CsvColumn } from "./csv.util";

interface Row {
  name: string;
  amount: number;
}

const COLUMNS: CsvColumn<Row>[] = [
  { key: "name", header: "Nome", value: (r) => r.name },
  { key: "amount", header: "Valor", value: (r) => r.amount },
];

const ROWS: Row[] = [
  { name: "Ana", amount: 100 },
  { name: 'Contém "aspas", vírgula', amount: 200 },
];

function stripBom(csv: string): string[] {
  const withoutBom = csv.charCodeAt(0) === 0xfeff ? csv.slice(1) : csv;
  return withoutBom.split("\r\n");
}

describe("buildCsv", () => {
  it("sempre usa vírgula como delimitador (não configurável)", () => {
    const lines = stripBom(buildCsv(ROWS, COLUMNS));
    expect(lines[0]).toBe("Nome,Valor");
    expect(lines[1]).toBe("Ana,100");
  });

  it("escapa células que contenham aspas e vírgula (quoting)", () => {
    const lines = stripBom(buildCsv(ROWS, COLUMNS));
    expect(lines[2]).toBe('"Contém ""aspas"", vírgula",200');
  });

  it("respeita `fields` para selecionar/ordenar colunas", () => {
    const lines = stripBom(buildCsv(ROWS, COLUMNS, ["amount"]));
    expect(lines[0]).toBe("Valor");
    expect(lines[1]).toBe("100");
  });
});
