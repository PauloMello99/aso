"use client"

import { Badge } from "@/shared/components/ui/badge"
import { cn } from "@/shared/lib/utils"
import type { TicketStatus } from "../schemas/ticket.schema"

const STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  waiting_customer: "Aguardando cliente",
  resolved: "Resolvido",
  closed: "Fechado",
}

const STATUS_VARIANT: Record<
  TicketStatus,
  "info" | "warning" | "success" | "ghost"
> = {
  open: "info",
  in_progress: "warning",
  waiting_customer: "warning",
  resolved: "success",
  closed: "ghost",
}

interface TicketStatusBadgeProps {
  status: TicketStatus
  className?: string
}

export function TicketStatusBadge({
  status,
  className,
}: TicketStatusBadgeProps) {
  return (
    <Badge
      variant={STATUS_VARIANT[status]}
      className={cn(status === "closed" && "bg-surface-2 text-text-muted", className)}
    >
      {STATUS_LABEL[status]}
    </Badge>
  )
}
