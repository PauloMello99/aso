"use client"

import { cn } from "@/shared/lib/utils"
import { Badge } from "@/shared/components/ui/badge"
import type { TicketResponse } from "../schemas/ticket.schema"

interface TicketThreadProps {
  // `isInternalNote` é opcional: o portal do cliente (TicketResponse) nunca
  // recebe esse campo do backend (respostas internas já vêm filtradas); só
  // a visão admin (AdminTicketResponse) o inclui.
  responses: (TicketResponse & { isInternalNote?: boolean })[]
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function authorLabel(authorType: TicketResponse["authorType"]): string {
  if (authorType === "customer") return "Você"
  if (authorType === "system") return "Sistema"
  return "Suporte"
}

export function TicketThread({ responses }: TicketThreadProps) {
  if (responses.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-foreground/[0.08] py-10 text-center">
        <p className="text-sm text-foreground/30">
          Nenhuma mensagem ainda. Envie a primeira resposta abaixo.
        </p>
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {responses.map((response) => {
        const isCustomer = response.authorType === "customer"
        return (
          <li
            key={response.id}
            className={cn("flex", isCustomer ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-xl border p-3 sm:max-w-[70%]",
                isCustomer
                  ? "border-primary-border bg-primary-subtle"
                  : "border-foreground/[0.06] bg-foreground/[0.02]",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-xs font-medium text-foreground/60">
                  {authorLabel(response.authorType)}
                  {response.isInternalNote && (
                    <Badge variant="warning">Nota interna</Badge>
                  )}
                </span>
                <span className="text-xs text-foreground/30">
                  {formatDateTime(response.createdAt)}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                {response.body}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
