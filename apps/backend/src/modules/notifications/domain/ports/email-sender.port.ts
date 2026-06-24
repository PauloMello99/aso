export const EMAIL_SENDER = Symbol("EMAIL_SENDER");

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

/** Porta de envio de e-mail (implementada por ResendEmailSender). */
export interface IEmailSender {
  /** Retorna true se enviou; false se desabilitado/no-op. Nunca lança. */
  send(input: SendEmailInput): Promise<boolean>;
}
