import { Inject, Injectable, Logger } from "@nestjs/common";
import { registerPostCommit } from "../../../database/database.module";
import { NotificationService } from "../../notifications/application/notification.service";
import { MaterialEntity } from "../domain/material.entity";
import {
  IStockVerificationRepository,
  STOCK_VERIFICATION_REPOSITORY,
} from "../domain/stock-verification.repository.interface";

export interface LowStockItem {
  id: string;
  name: string;
  stockQuantity: string;
  minimumQuantity: string;
}

export function toLowStockItem(material: MaterialEntity): LowStockItem {
  return {
    id: material.id,
    name: material.name,
    stockQuantity: material.stockQuantity,
    minimumQuantity: material.minimumQuantity,
  };
}

@Injectable()
export class LowStockAlertService {
  private readonly logger = new Logger(LowStockAlertService.name);

  // ATENCAO: do hook pos-commit (dispatch) so `findOwnerUserIds` (pool admin)
  // pode ser chamado em `stockVerificationRepo`. Qualquer metodo que use o
  // pool DRIZZLE falharia silenciosamente por RLS (client da request ja
  // liberado, sem claims).
  constructor(
    @Inject(STOCK_VERIFICATION_REPOSITORY)
    private readonly stockVerificationRepo: IStockVerificationRepository,
    private readonly notifications: NotificationService,
  ) {}

  scheduleIfAny(orgId: string, crossed: LowStockItem[]): void {
    if (crossed.length === 0) return;

    // Captura sincrona: o dispatch roda depois do COMMIT, sem depender do
    // estado da request.
    const items = crossed.map((item) => ({ ...item }));

    // Hook SINCRONO e dispatch DESTACADO (nao awaited) de proposito:
    // RlsContext.runWithClaims awaita os hooks pos-commit, e o dispatch faz
    // HTTP (Resend) — awaitar penalizaria a latencia da request. O dispatch
    // so usa o pool ADMIN/HTTP (nunca DRIZZLE: o client da request ja foi
    // liberado neste ponto). Nao "corrigir" para await.
    registerPostCommit(() => {
      void this.dispatch(orgId, items).catch((err: unknown) => {
        this.logger.warn(
          `Falha ao despachar alerta de estoque baixo (org ${orgId}): ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      });
    });
  }

  private async dispatch(orgId: string, items: LowStockItem[]): Promise<void> {
    const owners = await this.stockVerificationRepo.findOwnerUserIds(orgId);
    if (owners.length === 0) return;

    const [first] = items;
    const title =
      items.length === 1 && first
        ? `Estoque baixo: ${first.name}`
        : `${items.length} materiais abaixo do mínimo`;
    const body = items
      .map(
        (item) =>
          `${item.name}: atual ${item.stockQuantity}, mínimo ${item.minimumQuantity}`,
      )
      .join("\n");

    for (const userId of owners) {
      try {
        await this.notifications.notify({
          userId,
          orgId,
          type: "low_stock",
          title,
          body,
          data: { materialIds: items.map((item) => item.id) },
        });
      } catch (err) {
        this.logger.warn(
          `Falha ao notificar estoque baixo ao usuário ${userId}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
  }
}
