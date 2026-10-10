import { Inject, Injectable, Logger } from "@nestjs/common";
import { NotificationService } from "../../../notifications/application/notification.service";
import {
  APPOINTMENT_CONFIRMATION_REPOSITORY,
  AppointmentConfirmationResponse,
  AppointmentConfirmationView,
  IAppointmentConfirmationRepository,
} from "../../domain/appointment-confirmation.repository.interface";
import {
  hashConfirmationToken,
  isWellFormedConfirmationToken,
} from "../../domain/confirmation-token";
import { AppointmentConfirmationClosedException } from "../../domain/exceptions/appointment-confirmation-closed.exception";
import { AppointmentConfirmationExpiredException } from "../../domain/exceptions/appointment-confirmation-expired.exception";
import { AppointmentConfirmationNotFoundException } from "../../domain/exceptions/appointment-confirmation-not-found.exception";
import { formatWhenLabel } from "../appointment-confirmation-dispatcher";
import {
  AppointmentConfirmationPublicView,
  toAppointmentConfirmationPublicView,
} from "../appointment-confirmation-public-view";

export interface RespondAppointmentConfirmationInput {
  token: string;
  response: AppointmentConfirmationResponse;
}

const NOTIFICATION_TITLE: Record<AppointmentConfirmationResponse, string> = {
  confirmed: "Cliente confirmou presença",
  canceled_by_customer: "Cliente avisou que não poderá ir",
};

@Injectable()
export class RespondAppointmentConfirmationUseCase {
  private readonly logger = new Logger(
    RespondAppointmentConfirmationUseCase.name,
  );

  constructor(
    @Inject(APPOINTMENT_CONFIRMATION_REPOSITORY)
    private readonly repo: IAppointmentConfirmationRepository,
    private readonly notifications: NotificationService,
  ) {}

  async execute(
    input: RespondAppointmentConfirmationInput,
  ): Promise<AppointmentConfirmationPublicView> {
    if (!isWellFormedConfirmationToken(input.token)) {
      throw new AppointmentConfirmationNotFoundException();
    }
    const tokenHash = hashConfirmationToken(input.token);

    const view = await this.repo.findByTokenHash(tokenHash);
    if (!view) throw new AppointmentConfirmationNotFoundException();

    const now = new Date();
    if (now.getTime() >= view.event.startsAt.getTime()) {
      throw new AppointmentConfirmationExpiredException();
    }
    if (view.event.status === "canceled") {
      throw new AppointmentConfirmationClosedException();
    }

    const changed = await this.repo.recordResponse(
      view.event.id,
      tokenHash,
      input.response,
      now,
    );

    // recordResponse também devolve false quando a resposta já é a vigente;
    // relê para responder sempre com o estado atualizado.
    const latest = await this.repo.findByTokenHash(tokenHash);
    if (!latest) throw new AppointmentConfirmationNotFoundException();
    if (latest.event.confirmationStatus !== input.response) {
      // Corrida: o evento foi cancelado/começou entre a leitura e a escrita.
      throw latest.event.status === "canceled"
        ? new AppointmentConfirmationClosedException()
        : new AppointmentConfirmationExpiredException();
    }

    if (changed) {
      await this.notifyProfessional(latest, input.response);
    }

    return toAppointmentConfirmationPublicView(latest);
  }

  // Best-effort: falha de notificação não desfaz a resposta. Log sem PII.
  private async notifyProfessional(
    view: AppointmentConfirmationView,
    response: AppointmentConfirmationResponse,
  ): Promise<void> {
    const { event } = view;
    try {
      await this.notifications.notify({
        userId: event.assignedTo,
        orgId: event.orgId,
        type: "appointment_confirmation_response",
        title: NOTIFICATION_TITLE[response],
        body: `Agendamento de ${formatWhenLabel(event.startsAt, event.allDay)}.`,
        data: { eventId: event.id },
        email: false,
      });
    } catch (err) {
      this.logger.warn(
        `Falha ao notificar resposta de confirmação (evento ${event.id}): ${
          err instanceof Error ? err.name : "erro desconhecido"
        }`,
      );
    }
  }
}
