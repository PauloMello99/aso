import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MailService } from "../../mail/application/mail.service";
import { recipientDomain } from "../../mail/domain/recipient-domain";
import { registerPostCommit } from "../../../database/database.module";
import {
  APPOINTMENT_CONFIRMATION_REPOSITORY,
  IAppointmentConfirmationRepository,
} from "../domain/appointment-confirmation.repository.interface";
import type {
  CalendarEventConfirmationData,
  CalendarEventEntity,
} from "../domain/calendar-event.entity";
import {
  generateConfirmationToken,
  hashConfirmationToken,
} from "../domain/confirmation-token";

export type ConfirmationMailKind = "confirmation" | "reminder";

const DISPLAY_TIME_ZONE = "America/Sao_Paulo";

const WHEN_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  timeZone: DISPLAY_TIME_ZONE,
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// Ex.: "terça-feira, 20/10 às 14:00" (dia inteiro: "terça-feira, 20/10") —
// sempre em America/Sao_Paulo, não no fuso do servidor.
export function formatWhenLabel(startsAt: Date, allDay = false): string {
  const parts: Record<string, string> = {};
  for (const part of WHEN_FORMATTER.formatToParts(startsAt)) {
    parts[part.type] = part.value;
  }
  const day = `${parts["weekday"]}, ${parts["day"]}/${parts["month"]}`;
  return allDay ? day : `${day} às ${parts["hour"]}:${parts["minute"]}`;
}

export interface ConfirmationCycle {
  token: string;
  confirmation: CalendarEventConfirmationData;
}

@Injectable()
export class AppointmentConfirmationDispatcher {
  private readonly logger = new Logger(AppointmentConfirmationDispatcher.name);

  constructor(
    private readonly config: ConfigService,
    private readonly mail: MailService,
    @Inject(APPOINTMENT_CONFIRMATION_REPOSITORY)
    private readonly repo: IAppointmentConfirmationRepository,
  ) {}

  isEnabled(): boolean {
    return this.config.get<string>("APPOINTMENT_CONFIRMATION_ENABLED") === "true";
  }

  // Novo ciclo: um token válido por evento (o hash anterior é sobrescrito).
  buildCycle(now: Date): ConfirmationCycle {
    const token = generateConfirmationToken();
    return {
      token,
      confirmation: {
        status: "pending",
        tokenHash: hashConfirmationToken(token),
        requestedAt: now,
        sentAt: null,
        respondedAt: null,
        customerReminderSentAt: null,
      },
    };
  }

  // Agenda o envio do e-mail de confirmação para DEPOIS do COMMIT do request:
  // nada de HTTP (Resend) dentro da transação, e o carimbo só vale para uma
  // linha já commitada. Hook SÍNCRONO e envio DESTACADO (não awaited), como em
  // LowStockAlertService — o RlsContext awaita os hooks e penalizaria a latência.
  // Só usa o pool ADMIN/HTTP. O evento e o nome da org são relidos AQUI, por
  // hash (admin): confirma que a linha foi commitada e que este token ainda é
  // o vigente (reagendamento/troca de e-mail no meio-tempo => não envia).
  scheduleConfirmation(eventId: string, token: string): void {
    registerPostCommit(() => {
      void this.sendCommitted(eventId, token);
    });
  }

  private async sendCommitted(eventId: string, token: string): Promise<void> {
    try {
      const view = await this.repo.findByTokenHash(hashConfirmationToken(token));
      if (!view || view.event.id !== eventId) {
        this.logger.warn(
          `Confirmação de agendamento não enviada: ciclo não encontrado ou substituído (evento ${eventId})`,
        );
        return;
      }
      await this.sendAndMark(view.event, token, "confirmation", view.orgName);
    } catch (err) {
      this.logger.warn(
        `Falha ao preparar confirmação de agendamento (evento ${eventId}): ${
          err instanceof Error ? err.name : "erro desconhecido"
        }`,
      );
    }
  }

  // Best-effort: nunca relança. Retorna true só se o MailService confirmou o
  // envio; nesse caso, e só para kind "confirmation", carimba confirmation_sent_at
  // (por hash: reagendamento/troca de e-mail no meio-tempo invalida o carimbo).
  // O lembrete é carimbado pelo job via storeReminderToken.
  async sendAndMark(
    event: CalendarEventEntity,
    token: string,
    kind: ConfirmationMailKind,
    orgName: string,
  ): Promise<boolean> {
    const to = event.customerEmail;
    if (!to) return false;

    try {
      const frontendUrl = this.config.get<string>(
        "FRONTEND_URL",
        "http://localhost:3000",
      );
      const sent = await this.mail.sendAppointmentConfirmation({
        to,
        kind,
        orgName,
        whenLabel: formatWhenLabel(event.startsAt, event.allDay),
        confirmUrl: `${frontendUrl}/confirmar-agendamento/${token}`,
      });
      if (!sent) return false;
      if (kind === "confirmation") {
        await this.repo.markConfirmationSentByHash(
          event.id,
          hashConfirmationToken(token),
          new Date(),
        );
      }
      return true;
    } catch (err) {
      this.logger.warn(
        `Falha ao enviar ${kind} de agendamento (evento ${event.id}, destino ${recipientDomain(to)}): ${
          err instanceof Error ? err.name : "erro desconhecido"
        }`,
      );
      return false;
    }
  }
}
