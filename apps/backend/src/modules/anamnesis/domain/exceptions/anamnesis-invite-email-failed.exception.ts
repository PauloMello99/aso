import { DomainException } from "../../../../common/exceptions/domain.exception";

/**
 * Falha ao enviar o e-mail com o link de anamnese. Envio crítico — sem e-mail
 * o cliente não recebe o link, então a resposta é revertida (compensação) e o
 * ator pode tentar de novo.
 */
export class AnamnesisInviteEmailFailedException extends DomainException {
  readonly code = "ANAMNESIS_INVITE_EMAIL_FAILED";

  constructor(email: string) {
    super(`Failed to send anamnesis invite email to ${email}`);
  }
}
