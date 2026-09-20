import { Inject, Injectable } from "@nestjs/common";
import { MaterialEntity, UpdateMaterialData } from "../../domain/material.entity";
import { MaterialNotFoundException } from "../../domain/exceptions/material-not-found.exception";
import { MaterialServiceTypeInvalidException } from "../../domain/exceptions/material-service-type-invalid.exception";
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

    if (data.serviceTypeIds !== undefined && data.serviceTypeIds.length > 0) {
      const count = await this.materialRepo.countServiceTypesInOrg(
        orgId,
        data.serviceTypeIds,
      );
      if (count !== data.serviceTypeIds.length) {
        throw new MaterialServiceTypeInvalidException();
      }
    }

    // update primeiro, setServiceTypes depois: se o update falhar, os
    // vínculos não são tocados. (O request inteiro já roda numa transação de
    // RLS — isto é defesa em profundidade / clareza de intenção, não a única
    // garantia de atomicidade.)
    const updated = await this.materialRepo.update(id, data);

    if (data.serviceTypeIds !== undefined) {
      await this.materialRepo.setServiceTypes(id, orgId, data.serviceTypeIds);
    }

    // Só mudar o mínimo pode abrir/fechar episódio de estoque baixo; outros
    // campos nunca alertam.
    if (data.minimumQuantity !== undefined) {
      const crossed = await this.materialRepo.syncLowStockMarker(id);
      if (crossed) {
        this.lowStockAlerts.scheduleIfAny(orgId, [toLowStockItem(updated)]);
      }
    }

    const serviceTypeIds =
      data.serviceTypeIds ??
      (await this.materialRepo.findServiceTypeIdsByMaterial(id, orgId));

    return MaterialEntity.create({ ...updated, serviceTypeIds });
  }
}

