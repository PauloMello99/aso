import { Injectable } from "@nestjs/common";
import { ListCustomersUseCase } from "./list-customers.use-case";
import { ListCustomersFilter } from "../../domain/customer.repository.interface";
import { CustomerEntity } from "../../domain/customer.entity";
import {
  buildCsv,
  csvDate,
  type CsvColumn,
  type ExportFormat,
} from "../../../../common/csv/csv.util";
import { buildXlsx } from "../../../../common/csv/xlsx.util";

const GENDER_LABELS: Record<string, string> = {
  male: "Masculino",
  female: "Feminino",
  other: "Outro",
};

export const CUSTOMER_CSV_COLUMNS: CsvColumn<CustomerEntity>[] = [
  { key: "name", header: "Nome", value: (c) => c.name },
  { key: "email", header: "E-mail", value: (c) => c.email ?? "" },
  { key: "phone", header: "Telefone", value: (c) => c.phone ?? "" },
  {
    key: "gender",
    header: "Gênero",
    value: (c) => (c.gender ? (GENDER_LABELS[c.gender] ?? c.gender) : ""),
  },
  { key: "birthDate", header: "Nascimento", value: (c) => c.birthDate ?? "" },
  { key: "city", header: "Cidade", value: (c) => c.city ?? "" },
  { key: "state", header: "Estado", value: (c) => c.state ?? "" },
  { key: "country", header: "País", value: (c) => c.country ?? "" },
  {
    key: "status",
    header: "Status",
    value: (c) => (c.enabled ? "Ativo" : "Inativo"),
  },
  { key: "createdAt", header: "Cadastro", value: (c) => csvDate(c.createdAt) },
];

@Injectable()
export class ExportCustomersUseCase {
  constructor(private readonly listCustomers: ListCustomersUseCase) {}

  async execute(
    orgId: string,
    filter?: ListCustomersFilter,
    fields?: string[],
    format?: ExportFormat,
  ): Promise<string | Buffer> {
    const customers = await this.listCustomers.execute(orgId, filter);
    if (format === "xlsx") {
      return buildXlsx(customers, CUSTOMER_CSV_COLUMNS, fields);
    }
    return buildCsv(customers, CUSTOMER_CSV_COLUMNS, fields);
  }
}
