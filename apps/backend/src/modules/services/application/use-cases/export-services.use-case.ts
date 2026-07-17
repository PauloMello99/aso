import { Injectable } from "@nestjs/common";
import { ListServicesUseCase } from "./list-services.use-case";
import { ListServicesFilter } from "../../domain/service.repository.interface";
import { ServiceEntity } from "../../domain/service.entity";
import {
  buildCsv,
  csvDate,
  csvDelimiterChar,
  csvMoneyCents,
  type CsvColumn,
  type CsvDelimiter,
  type ExportFormat,
} from "../../../../common/csv/csv.util";
import { buildXlsx } from "../../../../common/csv/xlsx.util";

const METHOD_LABELS: Record<string, string> = {
  cash: "Dinheiro",
  bank_transfer: "Transferência / Pix",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  canceled: "Cancelado",
};

/** Colunas exportáveis de serviços (chaves usadas no seletor `?fields=`). */
export const SERVICE_CSV_COLUMNS: CsvColumn<ServiceEntity>[] = [
  { key: "date", header: "Data", value: (s) => csvDate(s.performedAt) },
  { key: "customer", header: "Cliente", value: (s) => s.customerName ?? "" },
  { key: "type", header: "Tipo", value: (s) => s.typeName ?? "" },
  {
    key: "professional",
    header: "Profissional",
    value: (s) => s.employeeName ?? "",
  },
  { key: "description", header: "Descrição", value: (s) => s.description ?? "" },
  {
    key: "amount",
    header: "Valor (R$)",
    value: (s) => csvMoneyCents(s.amountCents),
  },
  {
    key: "paymentMethod",
    header: "Método",
    value: (s) => METHOD_LABELS[s.paymentMethod] ?? s.paymentMethod,
  },
  {
    key: "status",
    header: "Status",
    value: (s) => STATUS_LABELS[s.status] ?? s.status,
  },
];

@Injectable()
export class ExportServicesUseCase {
  constructor(private readonly listServices: ListServicesUseCase) {}

  async execute(
    orgId: string,
    authId: string,
    filter?: ListServicesFilter,
    fields?: string[],
    format?: ExportFormat,
    delimiter?: CsvDelimiter,
  ): Promise<string | Buffer> {
    const services = await this.listServices.execute({
      orgId,
      authId,
      filter,
    });
    if (format === "xlsx") {
      return buildXlsx(services, SERVICE_CSV_COLUMNS, fields);
    }
    return buildCsv(
      services,
      SERVICE_CSV_COLUMNS,
      fields,
      csvDelimiterChar(delimiter ?? "comma"),
    );
  }
}
