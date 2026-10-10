import { CanActivate, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * Kill-switch da página pública de confirmação de agendamento. Desligada por
 * padrão: responde 404 (não 503) para não anunciar que a rota existe.
 */
@Injectable()
export class AppointmentConfirmationFeatureFlagGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(): boolean {
    const enabled =
      this.config.get<string>("APPOINTMENT_CONFIRMATION_ENABLED") === "true";
    if (!enabled) {
      throw new NotFoundException();
    }
    return true;
  }
}
