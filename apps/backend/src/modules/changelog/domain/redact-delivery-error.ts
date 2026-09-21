const KNOWN_CLASS =
  /^(send_returned_false|network_error|provider_http_[45]\d{2}|provider_error|unknown_error)$/;
const NETWORK_ERROR =
  /timeout|ETIMEDOUT|ECONNRESET|ECONNREFUSED|fetch failed|network/i;
const HTTP_STATUS = /(?<!\d)([45]\d{2})(?!\d)/;

function extractText(raw: unknown): string {
  if (typeof raw === "string") return raw.trim();
  if (raw instanceof Error) return raw.message.trim();
  if (typeof raw === "object" && raw !== null && "message" in raw) {
    const { message } = raw as { message?: unknown };
    if (typeof message === "string") return message.trim();
  }
  return "";
}

// O log `changelog_notifications` não tem FK e sobrevive à exclusão do usuário
// (LGPD): `error` só pode guardar CLASSE/CÓDIGO de falha (ADR-0033), nunca texto
// livre do provedor (que pode ecoar o e-mail). Nenhum trecho da mensagem
// original é devolvido — só um dos valores fixos abaixo (ou o status HTTP
// numérico). Idempotente: uma classe já conhecida volta igual.
export function classifyDeliveryError(raw: unknown): string {
  const text = extractText(raw);
  if (text === "") return "unknown_error";
  if (KNOWN_CLASS.test(text)) return text;
  if (NETWORK_ERROR.test(text)) return "network_error";
  const status = HTTP_STATUS.exec(text);
  if (status) return `provider_http_${status[1]}`;
  return "provider_error";
}

// Mantido para os callers existentes (repositório/use-case): devolve a classe.
export function redactDeliveryError(raw: unknown): string {
  return classifyDeliveryError(raw);
}
