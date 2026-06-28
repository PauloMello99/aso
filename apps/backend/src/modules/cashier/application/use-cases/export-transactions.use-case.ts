import { Injectable } from "@nestjs/common";
import { ListTransactionsUseCase } from "./list-transactions.use-case";
import { ListTransactionsFilter } from "../../domain/transaction.repository.interface";
import { TransactionEntity } from "../../domain/transaction.entity";
import {
  buildCsv,
  csvDate,
  csvMoneyCents,
  type CsvColumn,
} from "../../../../common/csv/csv.util";

const TYPE_LABELS: Record<string, string> = {
  income: "Entrada",
  outcome: "Saída",
};

const METHOD_LABELS: Record<string, string> = {
  cash: "Dinheiro",
  bank_transfer: "Transferência / Pix",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
  credits: "Créditos",
};

/** Colunas exportáveis do caixa (chaves usadas no seletor `?fields=`). */
export const TRANSACTION_CSV_COLUMNS: CsvColumn<TransactionEntity>[] = [
  { key: "date", header: "Data", value: (t) => csvDate(t.transactedAt) },
  { key: "description", header: "Descrição", value: (t) => t.description },
  {
    key: "type",
    header: "Tipo",
    value: (t) => TYPE_LABELS[t.type] ?? t.type,
  },
  {
    key: "paymentMethod",
    header: "Método",
    value: (t) => METHOD_LABELS[t.paymentMethod] ?? t.paymentMethod,
  },
  {
    key: "gross",
    header: "Bruto (R$)",
    value: (t) => csvMoneyCents(t.grossCents),
  },
  { key: "fee", header: "Taxa (R$)", value: (t) => csvMoneyCents(t.feeCents) },
  {
    key: "net",
    header: "Líquido (R$)",
    value: (t) => csvMoneyCents(t.netCents),
  },
  {
    key: "reversal",
    header: "Estorno",
    value: (t) => (t.isReversal ? "Sim" : ""),
  },
];

@Injectable()
export class ExportTransactionsUseCase {
  constructor(private readonly listTransactions: ListTransactionsUseCase) {}

  async execute(
    orgId: string,
    authId: string,
    filter?: ListTransactionsFilter,
    fields?: string[],
  ): Promise<string> {
    const views = await this.listTransactions.execute({
      orgId,
      authId,
      filter,
    });
    const entities = views.map((v) => v.entity);
    return buildCsv(entities, TRANSACTION_CSV_COLUMNS, fields);
  }
}
