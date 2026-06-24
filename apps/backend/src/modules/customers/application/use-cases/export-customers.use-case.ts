import { Injectable } from "@nestjs/common";
import { ListCustomersUseCase } from "./list-customers.use-case";
import { ListCustomersFilter } from "../../domain/customer.repository.interface";

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  // Escapa aspas e envolve em aspas se necessário.
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

@Injectable()
export class ExportCustomersUseCase {
  constructor(private readonly listCustomers: ListCustomersUseCase) {}

  async execute(orgId: string, filter?: ListCustomersFilter): Promise<string> {
    const customers = await this.listCustomers.execute(orgId, filter);
    const header = [
      "Nome",
      "E-mail",
      "Telefone",
      "Cidade",
      "Estado",
      "País",
      "Status",
    ];
    const rows = customers.map((c) =>
      [
        c.name,
        c.email ?? "",
        c.phone ?? "",
        c.city ?? "",
        c.state ?? "",
        c.country ?? "",
        c.enabled ? "Ativo" : "Inativo",
      ].map(csvCell).join(","),
    );
    // BOM para o Excel reconhecer UTF-8.
    return "﻿" + [header.join(","), ...rows].join("\r\n");
  }
}
