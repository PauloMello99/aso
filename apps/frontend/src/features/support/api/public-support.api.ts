import { apiRequest } from "@/infrastructure/api/client"
import type {
  CreatePublicTicketFormValues,
  CreatePublicTicketResponse,
} from "../schemas/public-ticket.schema"
import type { TicketCategory } from "../schemas/ticket.schema"

/**
 * Rotas `public/support/*` — sem auth (formulário público de abertura de
 * chamado). `skipAuth: true` é obrigatório aqui, não só para não anexar o
 * header: sem ele, `apiRequest` também tenta `refreshSession()` e, em um
 * 401, derruba a sessão do storage e redireciona para `/auth/login` — um
 * visitante anônimo com sessão expirada em localStorage seria expulso do
 * formulário público por engano.
 */

export function getPublicTicketCategories(): Promise<TicketCategory[]> {
  return apiRequest<TicketCategory[]>("/public/support/categories", {
    skipAuth: true,
  })
}

export function createPublicTicket(
  payload: CreatePublicTicketFormValues,
): Promise<CreatePublicTicketResponse> {
  return apiRequest<CreatePublicTicketResponse>("/public/support/tickets", {
    method: "POST",
    body: JSON.stringify(payload),
    skipAuth: true,
  })
}
