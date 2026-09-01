/**
 * Gatilhos de campanha de e-mail (T6 Bloco A). Espelha o enum de banco
 * `campaign_trigger_type` (`post_service | birthday | inactivity`); a ordem aqui
 * não é significativa.
 */
export const CAMPAIGN_TRIGGERS = [
  "post_service",
  "birthday",
  "inactivity",
] as const;

export type CampaignTrigger = (typeof CAMPAIGN_TRIGGERS)[number];

/**
 * Entrada plana (e não uma discriminated union) de propósito: os chamadores da
 * Fatia 2b/3 já resolvem `referenceDate` no fuso certo e passam só o id
 * relevante, e o spec precisa conseguir montar o caso "campo faltando" sem
 * recorrer a `as unknown as`.
 */
export interface DedupeKeyParams {
  serviceId?: string;
  customerId?: string;
  referenceDate: Date;
}

/**
 * Chave de idempotência de um envio de campanha. É regra de domínio, testável
 * isolada:
 *   - post_service -> `post_service:<serviceId>`
 *   - birthday     -> `birthday:<customerId>:<YYYY>`
 *   - inactivity   -> `inactivity:<customerId>:<YYYY-MM>`
 *
 * `YYYY`/`YYYY-MM` saem de `referenceDate` em UTC (`getUTCFullYear` /
 * `getUTCMonth`); o chamador é quem calcula `referenceDate` no fuso da org.
 * Lança `Error` se o id exigido pelo gatilho não veio (ou veio vazio) — um id
 * vazio cunharia silenciosamente uma chave colidente.
 */
export function buildDedupeKey(
  trigger: CampaignTrigger,
  params: DedupeKeyParams,
): string {
  switch (trigger) {
    case "post_service": {
      if (!params.serviceId) {
        throw new Error(
          "buildDedupeKey: 'serviceId' é obrigatório para o gatilho 'post_service'",
        );
      }
      return `post_service:${params.serviceId}`;
    }
    case "birthday": {
      if (!params.customerId) {
        throw new Error(
          "buildDedupeKey: 'customerId' é obrigatório para o gatilho 'birthday'",
        );
      }
      return `birthday:${params.customerId}:${params.referenceDate.getUTCFullYear()}`;
    }
    case "inactivity": {
      if (!params.customerId) {
        throw new Error(
          "buildDedupeKey: 'customerId' é obrigatório para o gatilho 'inactivity'",
        );
      }
      const year = params.referenceDate.getUTCFullYear();
      const month = String(params.referenceDate.getUTCMonth() + 1).padStart(
        2,
        "0",
      );
      return `inactivity:${params.customerId}:${year}-${month}`;
    }
  }
}

/**
 * Data-calendário de `date` em UTC no formato `YYYY-MM-DD`, mesma base que
 * `buildDedupeKey` usa (`getUTCFullYear`/`getUTCMonth`). As queries de gatilho da
 * Fatia 2b montam o `dedupe_key` em SQL a partir deste texto (`left(x, 4)` para
 * `YYYY`, `left(x, 7)` para `YYYY-MM`) em vez de `EXTRACT`/`to_char` sobre um
 * `timestamptz`, cujo `::date` dependeria do `TimeZone` da sessão do banco e
 * poderia divergir de `buildDedupeKey` perto da virada do dia.
 */
export function toUtcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}
