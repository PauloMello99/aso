export const QUOTE_SCHEDULE_MIN_DURATION_MINUTES = 15;
export const QUOTE_SCHEDULE_MAX_DURATION_MINUTES = 720;
export const QUOTE_SCHEDULE_DEFAULT_DURATION_MINUTES = 60;

const EVENT_TITLE_MAX_LENGTH = 200;
const EMAIL_MAX_LENGTH = 254;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Titulo do evento montado no servidor (limitado a 200 caracteres). */
export function buildQuoteEventTitle(requesterName: string): string {
  return `Orçamento: ${requesterName.trim()}`.slice(0, EVENT_TITLE_MAX_LENGTH);
}

/** E-mail do pedido se utilizavel (trim + lowercase); senao null (evento sem ciclo de confirmacao). */
export function toUsableCustomerEmail(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  if (normalized.length === 0 || normalized.length > EMAIL_MAX_LENGTH) return null;
  return EMAIL_PATTERN.test(normalized) ? normalized : null;
}
