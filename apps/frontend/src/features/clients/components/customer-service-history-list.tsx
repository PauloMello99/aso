"use client"

import { formatBRL } from "@/features/cashier/lib/money"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import {
  formatDate,
  StatusBadge,
} from "@/features/services/components/service-list"
import { serviceStatus, type Service } from "@/features/services/types"
import { cn } from "@/shared/lib/utils"

interface CustomerServiceHistoryListProps {
  services: Service[]
  onSelect?: (service: Service) => void
}

function ServiceCard({
  service,
  onSelect,
}: {
  service: Service
  onSelect?: (service: Service) => void
}) {
  const status = serviceStatus(service)
  return (
    <div
      onClick={() => onSelect?.(service)}
      className={cn(
        "flex items-start justify-between gap-3 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4",
        onSelect && "cursor-pointer",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium text-foreground">
            {service.typeName ?? "—"}
          </span>
          <StatusBadge status={status} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-foreground/40">
          <span>{formatDate(service.performedAt)}</span>
          {service.employeeName && <span>{service.employeeName}</span>}
        </div>
        <div className="mt-2 font-semibold tabular-nums text-foreground">
          {formatBRL(service.amountCents)}
        </div>
      </div>
    </div>
  )
}

export function CustomerServiceHistoryList({
  services,
  onSelect,
}: CustomerServiceHistoryListProps) {
  if (services.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-foreground/[0.08] py-16 text-center">
        <p className="text-sm text-foreground/30">
          Nenhum serviço registrado para este cliente ainda.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-3 sm:hidden">
        {services.map((s) => (
          <ServiceCard key={s.id} service={s} onSelect={onSelect} />
        ))}
      </div>

      <div className="hidden rounded-xl border border-foreground/[0.06] sm:block">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Tipo</TableHead>
              <TableHead>Profissional</TableHead>
              <TableHead>Execução</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-4 text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((s) => {
              const status = serviceStatus(s)
              return (
                <TableRow
                  key={s.id}
                  onClick={() => onSelect?.(s)}
                  className={cn(onSelect && "cursor-pointer")}
                >
                  <TableCell className="pl-4 font-medium text-foreground">
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
                  <TableCell className="pr-4 text-right font-semibold tabular-nums text-foreground">
                    {formatBRL(s.amountCents)}
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
