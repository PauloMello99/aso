import type { CampaignTrigger } from "./campaign-trigger";

export const CAMPAIGN_SEND_REPOSITORY = Symbol("CAMPAIGN_SEND_REPOSITORY");

/**
 * Log de UMA tentativa de envio de campanha. `status` só admite os terminais que
 * o cron escreve (`sent`/`failed`); `bounced` é linha extra pós-`sent` escrita
 * por webhook futuro, fora do MVP. `error` só faz sentido em `failed`.
 */
export interface RecordCampaignSendInput {
  orgId: string;
  customerId: string;
  trigger: CampaignTrigger;
  dedupeKey: string;
  attempt: number;
  status: "sent" | "failed";
  error?: string | null;
}

/**
 * Linha `failed` cuja tentativa é a ÚLTIMA daquele `dedupeKey` (nenhuma
 * `sent`/`bounced` e nenhuma `attempt` maior). Traz tudo que o cron precisa
 * para reconstruir o envio sem uma segunda ida ao banco: destinatário, nomes e
 * a copy custom da org (`null` = usar o default autoral). `findRetriable` já
 * aplica opt-out e org suspensa em SQL, como os helpers de `CampaignTarget`.
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
  bodyOverride: string | null;
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
}
