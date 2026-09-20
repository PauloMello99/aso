import { Inject, Injectable } from "@nestjs/common";
import { MaterialNotFoundException } from "../../domain/exceptions/material-not-found.exception";
import { MaterialEntity } from "../../domain/material.entity";
import {
  IMaterialRepository,
  MATERIAL_REPOSITORY,
} from "../../domain/material.repository.interface";
import {
  LowStockAlertService,
  toLowStockItem,
} from "../low-stock-alert.service";

@Injectable()
export class SetMaterialArchivedUseCase {
  constructor(
    @Inject(MATERIAL_REPOSITORY)
    private readonly materialRepo: IMaterialRepository,
    private readonly lowStockAlerts: LowStockAlertService,
  ) {}

  async execute(
    id: string,
    orgId: string,
    archived: boolean,
  ): Promise<MaterialEntity> {
    const existing = await this.materialRepo.findById(id, orgId);
    if (!existing) throw new MaterialNotFoundException(id);
    const updated = await this.materialRepo.setArchived(id, orgId, archived);

    // Arquivar limpa o marcador no repositório; desarquivar abaixo do mínimo
    // reabre o episódio de estoque baixo (mesma regra do update-material).
    if (!archived) {
      const crossed = await this.materialRepo.syncLowStockMarker(id);
      if (crossed) {
        this.lowStockAlerts.scheduleIfAny(orgId, [toLowStockItem(updated)]);
      }
    }
    return updated;
  }
}
