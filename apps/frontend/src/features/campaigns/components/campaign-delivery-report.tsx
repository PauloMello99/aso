"use client"

import { Loader2 } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { cn } from "@/shared/lib/utils"
import { useCampaignDeliveryReport } from "../hooks/use-campaign-delivery-report"
import {
  DELIVERY_STATUS_LABELS,
  TRIGGER_LABELS,
  deliveryReason,
  recipientEmail,
  recipientName,
} from "../lib/delivery-report"
import type {
  CampaignDeliveryReportRow,
  CampaignDeliveryStatus,
} from "../schemas/campaign-delivery-report.schema"

const STATUS_BADGE_VARIANT: Record<
  CampaignDeliveryStatus,
  "success" | "warning" | "destructive-subtle"
> = {
  sent: "success",
  bounced: "warning",
  failed: "destructive-subtle",
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function rowDate(row: CampaignDeliveryReportRow): string {
  return formatDateTime(row.sentAt ?? row.createdAt)
}

function StatusBadge({ status }: { status: CampaignDeliveryStatus }) {
  return (
    <Badge variant={STATUS_BADGE_VARIANT[status]}>
      {DELIVERY_STATUS_LABELS[status]}
    </Badge>
  )
}

function Reason({ row }: { row: CampaignDeliveryReportRow }) {
  const reason = deliveryReason(row.status, row.error)
  return (
    <div className="space-y-0.5 text-sm">
      <p className="text-foreground">{reason.title}</p>
      {reason.detail && (
        <p className="break-words text-xs text-muted-foreground">
          {reason.detail}
        </p>
      )}
      {reason.hint && (
        <p className="text-xs text-muted-foreground">{reason.hint}</p>
      )}
    </div>
  )
}

function Recipient({ row }: { row: CampaignDeliveryReportRow }) {
  return (
    <div className="min-w-0">
      <p
        className={cn(
          "truncate font-medium text-foreground",
          row.customerName === null && "italic text-muted-foreground",
        )}
      >
        {recipientName(row.customerName)}
      </p>
      <p className="truncate text-xs text-muted-foreground">
        {recipientEmail(row.customerEmail)}
      </p>
    </div>
  )
}

interface SummaryCardProps {
  label: string
  value: number
  valueClassName?: string
}

function SummaryCard({ label, value, valueClassName }: SummaryCardProps) {
  return (
    <div className="rounded-xl border border-foreground/[0.06] p-3 sm:p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-xl font-semibold text-foreground", valueClassName)}>
        {value}
      </p>
    </div>
  )
}

interface CampaignDeliveryReportProps {
  orgId: string
}

export function CampaignDeliveryReport({ orgId }: CampaignDeliveryReportProps) {
  const { summary, items, loading, error } = useCampaignDeliveryReport(orgId)

  return (
    <section className="space-y-4" aria-labelledby="delivery-report-title">
      <div>
        <h2
          id="delivery-report-title"
          className="text-lg font-semibold text-foreground"
        >
          Relatório de entrega
        </h2>
        <p className="text-sm text-muted-foreground">
          Situação dos e-mails enviados (últimos 200 envios). Para quem teve
          falha ou devolução, peça ao cliente para atualizar o cadastro, por
          exemplo por WhatsApp.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Enviado = aceito pelo provedor de e-mail. Falhas e devoluções (bounce)
          aparecem com o motivo.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-foreground/30">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Carregando relatório…
        </div>
      ) : error ? null : (
        <>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <SummaryCard
              label="Enviados"
              value={summary.sent}
              valueClassName="text-success"
            />
            <SummaryCard
              label="Falharam"
              value={summary.failed}
              valueClassName="text-destructive"
            />
            <SummaryCard
              label="Devolvidos"
              value={summary.bounced}
              valueClassName="text-warning"
            />
          </div>

          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-foreground/[0.08] py-12 text-center">
              <p className="text-sm text-foreground/40">
                Nenhum envio registrado ainda
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-foreground/[0.06] rounded-xl border border-foreground/[0.06] xl:hidden">
                {items.map((row) => (
                  <div key={row.id} className="flex flex-col gap-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <Recipient row={row} />
                      <StatusBadge status={row.status} />
                    </div>
                    <Reason row={row} />
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary">
                        {TRIGGER_LABELS[row.trigger]}
                      </Badge>
                      <span>{rowDate(row)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden rounded-xl border border-foreground/[0.06] xl:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-4">Destinatário</TableHead>
                      <TableHead>Gatilho</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead className="pr-4">Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="max-w-[16rem] pl-4">
                          <Recipient row={row} />
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {TRIGGER_LABELS[row.trigger]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={row.status} />
                        </TableCell>
                        <TableCell className="min-w-[14rem] max-w-[20rem] whitespace-normal">
                          <Reason row={row} />
                        </TableCell>
                        <TableCell className="pr-4 text-xs text-muted-foreground">
                          {rowDate(row)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </>
      )}
    </section>
  )
}
