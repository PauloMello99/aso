import { Inject, Injectable } from "@nestjs/common";
import { CreateMaterialData, MaterialEntity } from "../../domain/material.entity";
import {
  IMaterialRepository,
  MATERIAL_REPOSITORY,
} from "../../domain/material.repository.interface";

@Injectable()
export class CreateMaterialUseCase {
  constructor(
    @Inject(MATERIAL_REPOSITORY)
    private readonly materialRepo: IMaterialRepository,
  ) {}

  async execute(data: CreateMaterialData): Promise<MaterialEntity> {
    return this.materialRepo.create(data);
  }
}

