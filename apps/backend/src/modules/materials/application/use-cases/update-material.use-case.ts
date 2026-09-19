import { Inject, Injectable } from "@nestjs/common";
import { MaterialEntity, UpdateMaterialData } from "../../domain/material.entity";
import { MaterialNotFoundException } from "../../domain/exceptions/material-not-found.exception";
import {
  IMaterialRepository,
  MATERIAL_REPOSITORY,
} from "../../domain/material.repository.interface";
import {
  LowStockAlertService,
  toLowStockItem,
} from "../low-stock-alert.service";

@Injectable()
export class UpdateMaterialUseCase {
  constructor(
    @Inject(MATERIAL_REPOSITORY)
    private readonly materialRepo: IMaterialRepository,
    private readonly lowStockAlerts: LowStockAlertService,
  ) {}

  async execute(
    id: string,
    orgId: string,
    data: UpdateMaterialData,
  ): Promise<MaterialEntity> {
    const existing = await this.materialRepo.findById(id, orgId);
    if (!existing) throw new MaterialNotFoundException(id);
    const updated = await this.materialRepo.update(id, data);

    // Só mudar o mínimo pode abrir/fechar episódio de estoque baixo; outros
    // campos nunca alertam.
    if (data.minimumQuantity !== undefined) {
      const crossed = await this.materialRepo.syncLowStockMarker(id);
      if (crossed) {
        this.lowStockAlerts.scheduleIfAny(orgId, [toLowStockItem(updated)]);
      }
    }
    return updated;
  }
}

