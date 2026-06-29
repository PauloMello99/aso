import { DomainException } from "../../../../common/exceptions/domain.exception";

/**
 * Falha ao enviar o e-mail do convite com o canal habilitado. Como o envio é
 * crítico (sem e-mail o convidado não recebe o link), o convite é revertido e
 * esta exceção aborta o fluxo para o owner tentar de novo.
 */
export class InvitationEmailFailedException extends DomainException {
  readonly code = "INVITATION_EMAIL_FAILED";

  constructor(email: string) {
    super(`Failed to send invitation email to ${email}`);
  }
}
