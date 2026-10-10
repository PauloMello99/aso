import { Inject, Injectable, Logger } from "@nestjs/common";
import { recipientDomain } from "../../../mail/domain/recipient-domain";
import {
  APPOINTMENT_CONFIRMATION_REPOSITORY,
  IAppointmentConfirmationRepository,
} from "../../domain/appointment-confirmation.repository.interface";
import {
  generateConfirmationToken,
  hashConfirmationToken,
} from "../../domain/confirmation-token";
import { AppointmentConfirmationDispatcher } from "../appointment-confirmation-dispatcher";

const WINDOW_HOURS = 24;
const BATCH_LIMIT = 200;

export interface SendCustomerConfirmationRemindersResult {
  sent: number;
  skipped?: "disabled";
}

@Injectable()
export class SendCustomerConfirmationRemindersUseCase {
  private readonly logger = new Logger(
    SendCustomerConfirmationRemindersUseCase.name,
  );

  constructor(
    @Inject(APPOINTMENT_CONFIRMATION_REPOSITORY)
    private readonly repo: IAppointmentConfirmationRepository,
    private readonly dispatcher: AppointmentConfirmationDispatcher,
  ) {}

  async execute(): Promise<SendCustomerConfirmationRemindersResult> {
    if (!this.dispatcher.isEnabled()) return { sent: 0, skipped: "disabled" };

    const now = new Date();
    const until = new Date(now.getTime() + WINDOW_HOURS * 3_600_000);
    const due = await this.repo.findDueCustomerReminders(
      now,
      until,
      BATCH_LIMIT,
    );

    let sent = 0;
    for (const { event, orgName, requestedAt } of due) {
      const destination = event.customerEmail
        ? recipientDomain(event.customerEmail)
        : "(sem e-mail)";
      let claimed = false;
      let emailSent = false;
      try {
        // Reserva atômica presa ao snapshot do findDue: se o ciclo mudou desde
        // a leitura (reagendamento, troca de e-mail), o claim falha e pulamos.
        // `now` é o carimbo da reserva e a chave do compare-and-swap abaixo.
        if (
          !(await this.repo.claimCustomerReminder(
            event.id,
            now,
            until,
            requestedAt,
          ))
        ) {
          continue;
        }
        claimed = true;

        // O hash só é gravado depois de o envio ser confirmado: se o e-mail
        // não saiu, o token anterior continua válido.
        const token = generateConfirmationToken();
        const delivered = await this.dispatcher.sendAndMark(
          event,
          token,
          "reminder",
          orgName,
        );
        emailSent = delivered;
        if (!delivered) {
          this.logger.warn(
            `Lembrete de confirmação não entregue (evento ${event.id}, destino ${destination}, delivered=false); reserva liberada para o próximo tick`,
          );
          await this.release(event.id, now);
          continue;
        }

        // Compare-and-swap: se o evento foi reagendado/respondido depois do
        // claim, o hash do e-mail enviado não vale e não pode sobrescrever o
        // ciclo novo.
        const stored = await this.repo.storeReminderToken(
          event.id,
          hashConfirmationToken(token),
          now,
          new Date(),
        );
        if (!stored) {
          this.logger.warn(
            `Lembrete de confirmação enviado, mas o evento ${event.id} mudou desde a reserva; token não gravado`,
          );
          continue;
        }
        sent += 1;
      } catch (err) {
        const reason = err instanceof Error ? err.name : "erro desconhecido";
        if (emailSent) {
          // E-mail saiu, mas o token novo não foi gravado: o link do e-mail pode
          // não valer. Exige alerta próprio (sem PII).
          this.logger.error(
            `Lembrete de confirmação enviado, mas falhou ao gravar o token (evento ${event.id}): ${reason}`,
          );
        } else {
          this.logger.warn(
            `Falha no lembrete de confirmação (evento ${event.id}, destino ${destination}): ${reason}`,
          );
        }
        // Só libera se o e-mail NÃO saiu (evita lembrete duplicado no próximo tick).
        if (claimed && !emailSent) await this.release(event.id, now);
      }
    }

    this.logger.log(`Lembretes de confirmação ao cliente enviados: ${sent}`);
    return { sent };
  }

  // Best-effort: se a liberação falhar, o lembrete daquele evento não é retentado.
  private async release(eventId: string, claimedAt: Date): Promise<void> {
    try {
      await this.repo.releaseCustomerReminder(eventId, claimedAt);
    } catch (err) {
      this.logger.warn(
        `Falha ao liberar a reserva do lembrete (evento ${eventId}): ${
          err instanceof Error ? err.name : "erro desconhecido"
        }`,
      );
    }
  }
}
