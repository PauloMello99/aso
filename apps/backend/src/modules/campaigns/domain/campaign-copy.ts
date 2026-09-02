import type { TiptapDoc, TiptapNode, TiptapText } from "./campaign-body";
import type { CampaignTrigger } from "./campaign-trigger";

function paragraphsToDoc(lines: string[]): TiptapDoc {
  return {
    type: "doc",
    content: lines.map((line) => ({
      type: "paragraph",
      content: [{ type: "text", text: line }],
    })),
  };
}

/**
 * Copy autoral pt-BR de cada gatilho de campanha (T6 Bloco A). É o fallback
 * quando a org não escreveu um texto custom em `campaigns` (`subject`/`body`
 * NULL). Tom do produto, sem promessa comercial. Tokens permitidos:
 * `{{customerName}}` e `{{orgName}}` — no assunto a interpolação é
 * `resolveCampaignCopy`, no corpo é o renderer (`renderCampaignBody`).
 */
export const CAMPAIGN_DEFAULT_COPY: Record<
  CampaignTrigger,
  { subject: string; body: TiptapDoc }
> = {
  post_service: {
    subject: "Como foi seu atendimento na {{orgName}}?",
    body: paragraphsToDoc([
      "Olá, {{customerName}}!",
      "Passamos para saber como foi seu último atendimento na {{orgName}}.",
      "Se puder responder a este e-mail com uma palavra sobre a sua experiência, ajuda muito a gente a melhorar.",
    ]),
  },
  birthday: {
    subject: "Feliz aniversário, {{customerName}}!",
    body: paragraphsToDoc([
      "Olá, {{customerName}}!",
      "A equipe da {{orgName}} passa para desejar um feliz aniversário.",
      "Que seja um ótimo dia.",
    ]),
  },
  inactivity: {
    subject: "Sentimos sua falta na {{orgName}}",
    body: paragraphsToDoc([
      "Olá, {{customerName}}!",
      "Faz um tempo desde a sua última visita à {{orgName}} e queríamos dizer que você é sempre bem-vindo(a) de volta.",
      "Quando quiser marcar um horário, é só responder a este e-mail.",
    ]),
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
 * Resolve o assunto e o corpo de um e-mail de campanha.
 *
 * Fallback POR CAMPO e independente: `subjectOverride` vazio/whitespace cai no
 * default do gatilho sem afetar o corpo, e vice-versa.
 *
 * Assunto: interpola os tokens sobre o texto já resolvido (custom OU default),
 * remove CR/LF (o CHECK do banco valida comprimento mas não quebra de linha, e
 * o texto vai direto ao campo `subject` do provider — risco de header
 * injection) e corta em 200 chars (um template que passa no CHECK pode estourar
 * depois de `{{orgName}}` expandir).
 *
 * Corpo: devolvido como `TiptapDoc` SEM interpolação — o renderer da campanha
 * (`renderCampaignBody`) interpola nos nós de texto na hora de emitir o HTML.
 * Se o `body` custom não tem nenhum texto visível (doc vazio, só parágrafos
 * vazios ou só whitespace), cai no doc default autoral do gatilho.
 */
export function resolveCampaignCopy(input: {
  trigger: CampaignTrigger;
  subjectOverride: string | null;
  body: TiptapDoc | null;
  customerName: string;
  orgName: string;
}): { subject: string; body: TiptapDoc } {
  const { trigger, subjectOverride, body, customerName, orgName } = input;
  const values = { customerName, orgName };
  const defaults = CAMPAIGN_DEFAULT_COPY[trigger];

  const subjectTemplate = subjectOverride?.trim() || defaults.subject;
  const subject = interpolate(subjectTemplate, values)
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, SUBJECT_MAX_LENGTH);

  const resolvedBody =
    body && docHasText(body) ? body : CAMPAIGN_DEFAULT_COPY[trigger].body;

  return { subject, body: resolvedBody };
}

/**
 * `true` se o doc tem ao menos um nó `text` com conteúdo visível (`.trim()` não
 * vazio), varrendo `content` recursivamente. Equivalente do antigo teste
 * "parágrafos != 0" agora que o corpo é Tiptap-JSON. Walker simples, sem libs;
 * `content` ausente (parágrafo vazio) não lança.
 *
 * `doc` vem de um jsonb (`campaigns.body`) cujo CHECK só garante
 * `jsonb_typeof = 'object'` — um objeto fora de forma (sem `content` array)
 * chega aqui apesar do tipo. Nesse caso devolve `false` (cai no default
 * autoral) em vez de estourar `for (const node of undefined)` no cron.
 */
function docHasText(doc: TiptapDoc): boolean {
  const content: unknown = doc.content;
  return Array.isArray(content)
    ? nodesHaveText(content as (TiptapNode | TiptapText)[])
    : false;
}

function nodesHaveText(nodes: (TiptapNode | TiptapText)[]): boolean {
  for (const node of nodes) {
    if (node.type === "text") {
      if (typeof node.text === "string" && node.text.trim().length > 0) {
        return true;
      }
      continue;
    }
    if ("content" in node && node.content && nodesHaveText(node.content)) {
      return true;
    }
  }
  return false;
}

/**
 * Devolve o corpo default autoral de um gatilho — a copy default já está em
 * Tiptap-JSON (`CAMPAIGN_DEFAULT_COPY[trigger].body`). Usado pelo
 * `ListCampaignsUseCase` para pré-preencher o editor rich-text do frontend
 * ("comece da copy do ASO e adicione a essência da sua org").
 *
 * NÃO interpola tokens: o editor mostra `{{customerName}}` literal como
 * placeholder editável.
 */
export function campaignDefaultBodyDoc(trigger: CampaignTrigger): TiptapDoc {
  return CAMPAIGN_DEFAULT_COPY[trigger].body;
}
