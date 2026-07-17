import { Injectable } from "@nestjs/common";
import {
  ListMaterialsUseCase,
  type MaterialListItemView,
} from "./list-materials.use-case";
import { ListMaterialsFilter } from "../../domain/material.repository.interface";
import {
  buildCsv,
  csvDate,
  csvDelimiterChar,
  type CsvColumn,
  type CsvDelimiter,
  type ExportFormat,
} from "../../../../common/csv/csv.util";
import { buildXlsx } from "../../../../common/csv/xlsx.util";

/** Colunas exportáveis de materiais (chaves usadas no seletor `?fields=`). */
export const MATERIAL_CSV_COLUMNS: CsvColumn<MaterialListItemView>[] = [
  { key: "name", header: "Material", value: (m) => m.name },
  { key: "stock", header: "Estoque", value: (m) => m.stockQuantity },
  { key: "minimum", header: "Mínimo", value: (m) => m.minimumQuantity },
  {
    key: "cost",
    header: "Custo unitário (R$)",
    value: (m) => (m.costPerUnit ? m.costPerUnit.replace(".", ",") : ""),
  },
  {
    key: "shareable",
    header: "Compartilhável",
    value: (m) => (m.shareable ? "Sim" : "Não"),
  },
  {
    key: "lowStock",
    header: "Estoque baixo",
    value: (m) => (m.isLowStock ? "Sim" : ""),
  },
  {
    key: "status",
    header: "Status",
    value: (m) => (m.isArchived ? "Arquivado" : "Ativo"),
  },
  {
    key: "lastUsed",
    header: "Último uso",
    value: (m) => csvDate(m.lastUsedAt),
  },
];

@Injectable()
export class ExportMaterialsUseCase {
  constructor(private readonly listMaterials: ListMaterialsUseCase) {}

  async execute(
    orgId: string,
    filter?: ListMaterialsFilter,
    fields?: string[],
    authId?: string,
    format?: ExportFormat,
    delimiter?: CsvDelimiter,
  ): Promise<string | Buffer> {
    const materials = await this.listMaterials.execute(orgId, filter, authId);
    if (format === "xlsx") {
      return buildXlsx(materials, MATERIAL_CSV_COLUMNS, fields);
    }
    return buildCsv(
      materials,
      MATERIAL_CSV_COLUMNS,
      fields,
      csvDelimiterChar(delimiter ?? "comma"),
    );
  }
}
