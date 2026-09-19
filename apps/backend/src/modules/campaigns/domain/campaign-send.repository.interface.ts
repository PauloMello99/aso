import type { TiptapDoc } from "./campaign-body";
import type { CampaignTrigger } from "./campaign-trigger";

export const CAMPAIGN_SEND_REPOSITORY = Symbol("CAMPAIGN_SEND_REPOSITORY");

/**
 * Log de UMA tentativa de envio de campanha. `status` só admite os terminais que
 * o cron escreve (`sent`/`failed`); `bounced` é linha extra pós-`sent` escrita
 * pelo webhook de entrega (ver `recordBounce`). `error` só faz sentido em
 * `failed`. `id` é pré-gerado pelo CALLER (cron, fora deste módulo) porque o
 * MESMO UUID vira a tag enviada ao provedor de e-mail — é a única cola entre o
 * evento de bounce do webhook e esta linha `sent`.
 */
export interface RecordCampaignSendInput {
  id: string;
  orgId: string;
  customerId: string;
  trigger: CampaignTrigger;
  dedupeKey: string;
  attempt: number;
  status: "sent" | "failed";
  error?: string | null;
}

/**
 * Insumo para registrar um bounce. `sentRowId` é o `id` da linha `sent`
 * original (o mesmo UUID que veio na tag do webhook, resolvido via
 * `findSentById`) — serve só para rastreabilidade do caller (ex.: audit log),
 * NÃO é a PK da linha `bounced` nova: essa é gerada pelo repositório, porque
 * `bounced` é uma linha ADICIONAL (append-only), nunca um UPDATE da linha
 * `sent`. Os demais campos são copiados da linha `sent` original (o webhook só
 * traz a tag e o motivo do bounce, não o resto do contexto).
 */
export interface RecordCampaignBounceInput {
  sentRowId: string;
  orgId: string;
  customerId: string;
  trigger: CampaignTrigger;
  dedupeKey: string;
  attempt: number;
  sentAt: Date | null;
  reason: string | null;
}

/**
 * Projeção da linha `sent` original, resolvida pela tag do webhook (`id`).
 * `null` se a linha não existe ou não está (mais) em `sent` — o caller trata
 * isso como "nada a fazer", nunca como erro (ver `HandleCampaignBounceUseCase`).
 */
export interface SentCampaignSend {
  orgId: string;
  customerId: string;
  trigger: CampaignTrigger;
  dedupeKey: string;
  attempt: number;
  sentAt: Date | null;
}

/**
 * Linha `failed` cuja tentativa é a ÚLTIMA daquele `dedupeKey` (nenhuma
 * `sent`/`bounced` e nenhuma `attempt` maior). Traz tudo que o cron precisa
 * para reconstruir o envio sem uma segunda ida ao banco: destinatário, nomes e
 * a copy custom da campanha do gatilho (`campaigns.subject` / `campaigns.body`
 * jsonb; `null` = usar o default autoral). `findRetriable` já aplica opt-out e
 * org suspensa em SQL, como os helpers de `CampaignTarget`.
 */
export interface RetriableCampaignSend {
  id: string;
  orgId: string;
  customerId: string;
  trigger: CampaignTrigger;
  dedupeKey: string;
  attempt: number;
  customerName: string;
  customerEmail: string;
  orgName: string;
  subjectOverride: string | null;
  body: TiptapDoc | null;
}

export interface ICampaignSendRepository {
  /**
   * INSERT único da linha terminal, DEPOIS da chamada ao sender. `sentAt` é
   * `new Date()` em `sent` e `null` em `failed` (respeita o CHECK
   * `campaign_sends_sent_at_check`). `ON CONFLICT DO NOTHING` sobre a unique
   * `(dedupe_key, attempt, status)` — idempotência defensiva se o tick
   * reprocessar o mesmo gatilho.
   */
  record(input: RecordCampaignSendInput): Promise<void>;
  /**
   * Linhas retriáveis: última tentativa do `dedupe_key` é `failed` e
   * `attempt < maxAttempts`. `ORDER BY created_at ASC LIMIT limit`.
   */
  findRetriable(
    maxAttempts: number,
    limit: number,
  ): Promise<RetriableCampaignSend[]>;
  /**
   * INSERT de uma linha NOVA `bounced` (nunca UPDATE da linha `sent`
   * original) para a MESMA `(dedupe_key, attempt)`. `ON CONFLICT DO NOTHING`
   * sobre a unique `(dedupe_key, attempt, status)` — reentrega do mesmo
   * evento de bounce pelo Resend não duplica. Devolve `true` se inseriu a linha
   * e `false` se foi reentrega (conflito) — o caller usa isso para não repetir
   * efeitos colaterais (ex.: audit log).
   */
  recordBounce(input: RecordCampaignBounceInput): Promise<boolean>;
  /**
   * Resolve a linha `sent` pela tag ecoada pelo Resend (o `id` pré-gerado no
   * envio). `null` só se a linha não existir ou nunca ter atingido `sent`
   * (tag adulterada/desconhecida) — uma linha que JÁ tem bounce registrado
   * continua retornando normalmente (append-only: o `sent` original nunca
   * muda de status). A dedupe de reentrega do webhook NÃO é responsabilidade
   * deste método; é a unique `(dedupe_key, attempt, status)` aplicada em
   * `recordBounce`.
   */
  findSentById(id: string): Promise<SentCampaignSend | null>;
}
