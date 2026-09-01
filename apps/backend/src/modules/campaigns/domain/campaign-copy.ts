import type { CampaignTrigger } from "./campaign-trigger";

/**
 * Copy autoral pt-BR de cada gatilho de campanha (T6 Bloco A). É o fallback
 * quando a org não escreveu um texto custom em `org_campaign_settings`. Tom do
 * produto, sem promessa comercial. Tokens permitidos: `{{customerName}}` e
 * `{{orgName}}` (ver `resolveCampaignCopy`).
 */
export const CAMPAIGN_DEFAULT_COPY: Record<
  CampaignTrigger,
  { subject: string; body: string }
> = {
  post_service: {
    subject: "Como foi seu atendimento na {{orgName}}?",
    body: [
      "Olá, {{customerName}}!",
      "Passamos para saber como foi seu último atendimento na {{orgName}}.",
      "Se puder responder a este e-mail com uma palavra sobre a sua experiência, ajuda muito a gente a melhorar.",
    ].join("\n"),
  },
  birthday: {
    subject: "Feliz aniversário, {{customerName}}!",
    body: [
      "Olá, {{customerName}}!",
      "A equipe da {{orgName}} passa para desejar um feliz aniversário.",
      "Que seja um ótimo dia.",
    ].join("\n"),
  },
  inactivity: {
    subject: "Sentimos sua falta na {{orgName}}",
    body: [
      "Olá, {{customerName}}!",
      "Faz um tempo desde a sua última visita à {{orgName}} e queríamos dizer que você é sempre bem-vindo(a) de volta.",
      "Quando quiser marcar um horário, é só responder a este e-mail.",
    ].join("\n"),
  },
};

const TOKEN_PATTERN = /\{\{(customerName|orgName)\}\}/g;
const SUBJECT_MAX_LENGTH = 200;

/**
 * Interpola os tokens permitidos em PASSE ÚNICO por regex allowlist: um valor
 * que contenha `{{orgName}}` nunca é re-substituído, e um token fora da lista
 * (ex. `{{email}}`) fica literal por não casar o padrão. Nunca usar `replace`
 * sequencial token a token.
 */
function interpolate(
  text: string,
  values: { customerName: string; orgName: string },
): string {
  return text.replace(TOKEN_PATTERN, (_, token: "customerName" | "orgName") =>
    values[token],
  );
}

/**
 * Resolve o assunto e os parágrafos do corpo de um e-mail de campanha.
 *
 * Fallback POR CAMPO e independente: `subjectOverride` vazio/whitespace cai no
 * default do gatilho sem afetar o corpo, e vice-versa. A interpolação roda uma
 * única vez sobre o texto já resolvido (custom OU default).
 *
 * Assunto: depois da interpolação, remove CR/LF (o CHECK do banco valida
 * comprimento mas não quebra de linha, e o texto vai direto ao campo `subject`
 * do provider — risco de header injection) e corta em 200 chars (um template
 * que passa no CHECK pode estourar depois de `{{orgName}}` expandir).
 *
 * Corpo: uma linha por parágrafo, `trim()` em cada, linhas vazias descartadas.
 * Se o custom só tinha whitespace e sobrou array vazio, re-resolve pelo MESMO
 * caminho a partir do corpo default (que também é interpolado).
 */
export function resolveCampaignCopy(input: {
  trigger: CampaignTrigger;
  subjectOverride: string | null;
  bodyOverride: string | null;
  customerName: string;
  orgName: string;
}): { subject: string; bodyParagraphs: string[] } {
  const { trigger, subjectOverride, bodyOverride, customerName, orgName } = input;
  const values = { customerName, orgName };
  const defaults = CAMPAIGN_DEFAULT_COPY[trigger];

  const subjectTemplate = subjectOverride?.trim() || defaults.subject;
  const subject = interpolate(subjectTemplate, values)
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, SUBJECT_MAX_LENGTH);

  const bodyTemplate = bodyOverride?.trim() || defaults.body;
  let bodyParagraphs = toParagraphs(interpolate(bodyTemplate, values));
  if (bodyParagraphs.length === 0) {
    bodyParagraphs = toParagraphs(interpolate(defaults.body, values));
  }

  return { subject, bodyParagraphs };
}

function toParagraphs(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
