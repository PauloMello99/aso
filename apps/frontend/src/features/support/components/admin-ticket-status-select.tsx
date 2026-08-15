"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import {
  CHANGEABLE_TICKET_STATUSES,
  type ChangeableTicketStatus,
  type TicketStatus,
} from "../schemas/ticket.schema"

const STATUS_LABEL: Record<ChangeableTicketStatus, string> = {
  in_progress: "Em andamento",
  waiting_customer: "Aguardando cliente",
  resolved: "Resolvido",
  closed: "Fechado",
}

interface AdminTicketStatusSelectProps {
  status: TicketStatus
  disabled: boolean
  onChange: (status: ChangeableTicketStatus) => void
}

export function AdminTicketStatusSelect({
  status,
  disabled,
  onChange,
}: AdminTicketStatusSelectProps) {
  return (
    <Select
      value={status}
      disabled={disabled}
      onValueChange={(value) => onChange(value as ChangeableTicketStatus)}
    >
      <SelectTrigger className="h-8 w-full text-sm sm:w-52">
        <SelectValue placeholder="Mudar status" />
      </SelectTrigger>
      <SelectContent>
        {status === "open" && (
          <SelectItem value="open" disabled>
            Aberto
          </SelectItem>
        )}
        {CHANGEABLE_TICKET_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {STATUS_LABEL[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
