import type { AdminTicket } from "../schemas/ticket.schema"

type SlaBreachFields = Pick<
  AdminTicket,
  "slaFirstResponseBreachedAt" | "slaResolutionBreachedAt"
>

/**
 * Um ticket está com SLA vencido se o backend já marcou o breach de
 * primeira resposta e/ou de resolução (`sweep-ticket-sla.use-case.ts`
 * popula esses campos periodicamente — não recalculamos no frontend).
 */
export function isSlaBreached(ticket: SlaBreachFields): boolean {
  return (
    ticket.slaFirstResponseBreachedAt !== null ||
    ticket.slaResolutionBreachedAt !== null
  )
}
