"use client"

import { MoreVertical, Pencil, Undo2, Wallet } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { cn } from "@/shared/lib/utils"
import { formatBRL } from "@/features/cashier/lib/money"
import {
  SERVICE_STATUS_LABELS,
  serviceStatus,
  type Service,
  type ServiceStatus,
} from "../types"

interface ServiceListProps {
  services: Service[]
  onEdit: (s: Service) => void
  onPay: (s: Service) => void
  onCancel: (s: Service) => void
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function StatusBadge({ status }: { status: ServiceStatus }) {
  const variant =
    status === "paid"
      ? "bg-emerald-500/10 text-emerald-400"
      : status === "pending"
        ? "bg-amber-500/10 text-amber-400"
        : "bg-red-500/10 text-red-400"
  return (
    <Badge variant="ghost" className={variant}>
      {SERVICE_STATUS_LABELS[status]}
    </Badge>
  )
}

function ActionMenu({
  service,
  onEdit,
  onPay,
  onCancel,
}: {
  service: Service
  onEdit: (s: Service) => void
  onPay: (s: Service) => void
  onCancel: (s: Service) => void
}) {
  const status = serviceStatus(service)
  if (status === "canceled") return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Ações</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[190px]">
        <DropdownMenuItem onClick={() => onEdit(service)}>
          <Pencil className="h-3.5 w-3.5 shrink-0" />
          Editar
        </DropdownMenuItem>
        {status === "pending" && (
          <DropdownMenuItem onClick={() => onPay(service)}>
            <Wallet className="h-3.5 w-3.5 shrink-0" />
            Registrar pagamento
          </DropdownMenuItem>
        )}
        <DropdownMenuItem variant="destructive" onClick={() => onCancel(service)}>
          <Undo2 className="h-3.5 w-3.5 shrink-0" />
          Cancelar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function MobileCard({
  service,
  onEdit,
  onPay,
  onCancel,
}: {
  service: Service
  onEdit: (s: Service) => void
  onPay: (s: Service) => void
  onCancel: (s: Service) => void
}) {
  const status = serviceStatus(service)
  const struck = status === "canceled"
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-xl border p-4",
        struck
          ? "border-foreground/[0.04] bg-foreground/[0.01]"
          : "border-foreground/[0.06] bg-foreground/[0.02]",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "truncate font-medium",
              struck ? "text-foreground/40 line-through" : "text-foreground",
            )}
          >
            {service.customerName ?? "Cliente removido"}
          </span>
          <StatusBadge status={status} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-foreground/40">
          {service.typeName && <span>{service.typeName}</span>}
          <span>{formatDate(service.performedAt)}</span>
          {service.employeeName && <span>{service.employeeName}</span>}
        </div>
        <div className="mt-2 font-semibold tabular-nums text-foreground">
          {formatBRL(service.amountCents)}
        </div>
      </div>
      <ActionMenu
        service={service}
        onEdit={onEdit}
        onPay={onPay}
        onCancel={onCancel}
      />
    </div>
  )
}

export function ServiceList({
  services,
  onEdit,
  onPay,
  onCancel,
}: ServiceListProps) {
  if (services.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-foreground/[0.08] py-16 text-center">
        <p className="text-sm text-foreground/30">Nenhum serviço no período.</p>
        <p className="mt-1 text-xs text-foreground/20">
          Clique em &quot;Novo serviço&quot; para registrar um atendimento.
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Mobile: cards */}
      <div className="grid gap-3 sm:hidden">
        {services.map((s) => (
          <MobileCard
            key={s.id}
            service={s}
            onEdit={onEdit}
            onPay={onPay}
            onCancel={onCancel}
          />
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden rounded-xl border border-foreground/[0.06] sm:block">
        <Table className="min-w-[680px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Cliente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Profissional</TableHead>
              <TableHead>Execução</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="pr-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((s) => {
              const status = serviceStatus(s)
              const struck = status === "canceled"
              return (
                <TableRow key={s.id} className={cn(struck && "bg-foreground/[0.01]")}>
                  <TableCell className="pl-4">
                    <span
                      className={cn(
                        "font-medium",
                        struck ? "text-foreground/40 line-through" : "text-foreground",
                      )}
                    >
                      {s.customerName ?? "Cliente removido"}
                    </span>
                  </TableCell>
                  <TableCell className="text-foreground/50">
                    {s.typeName ?? "—"}
                  </TableCell>
                  <TableCell className="text-foreground/50">
                    {s.employeeName ?? "—"}
                  </TableCell>
                  <TableCell className="text-foreground/40">
                    {formatDate(s.performedAt)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={status} />
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-foreground">
                    {formatBRL(s.amountCents)}
                  </TableCell>
                  <TableCell className="pr-4">
                    <div className="flex justify-end">
                      <ActionMenu
                        service={s}
                        onEdit={onEdit}
                        onPay={onPay}
                        onCancel={onCancel}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
