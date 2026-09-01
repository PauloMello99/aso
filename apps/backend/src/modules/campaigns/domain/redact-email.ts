const EMAIL_PATTERN = /\S+@\S+\.\S+/g;
const MAX_ERROR_LENGTH = 300;

/**
 * Redige e trunca a mensagem de erro de um provider antes de persistir em
 * `campaign_sends.error` (tabela sem RLS). Erros de envio de e-mail costumam
 * ecoar o endereço do destinatário (PII); qualquer trecho com forma de e-mail
 * vira `[email redigido]` e o texto é cortado em 300 chars. Redige ANTES de
 * truncar para não deixar um e-mail partido pela metade.
 */
export function redactEmail(message: string): string {
  return message
    .replace(EMAIL_PATTERN, "[email redigido]")
    .slice(0, MAX_ERROR_LENGTH);
}
