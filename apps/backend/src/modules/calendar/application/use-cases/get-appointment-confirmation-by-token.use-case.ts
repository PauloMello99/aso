import { Inject, Injectable } from "@nestjs/common";
import {
  APPOINTMENT_CONFIRMATION_REPOSITORY,
  IAppointmentConfirmationRepository,
} from "../../domain/appointment-confirmation.repository.interface";
import {
  hashConfirmationToken,
  isWellFormedConfirmationToken,
} from "../../domain/confirmation-token";
import { AppointmentConfirmationExpiredException } from "../../domain/exceptions/appointment-confirmation-expired.exception";
import { AppointmentConfirmationNotFoundException } from "../../domain/exceptions/appointment-confirmation-not-found.exception";
import {
  AppointmentConfirmationPublicView,
  toAppointmentConfirmationPublicView,
} from "../appointment-confirmation-public-view";

@Injectable()
export class GetAppointmentConfirmationByTokenUseCase {
  constructor(
    @Inject(APPOINTMENT_CONFIRMATION_REPOSITORY)
    private readonly repo: IAppointmentConfirmationRepository,
  ) {}

  async execute(token: string): Promise<AppointmentConfirmationPublicView> {
    if (!isWellFormedConfirmationToken(token)) {
      throw new AppointmentConfirmationNotFoundException();
    }

    const view = await this.repo.findByTokenHash(hashConfirmationToken(token));
    if (!view) throw new AppointmentConfirmationNotFoundException();

    if (Date.now() >= view.event.startsAt.getTime()) {
      throw new AppointmentConfirmationExpiredException();
    }

    return toAppointmentConfirmationPublicView(view);
  }
}
