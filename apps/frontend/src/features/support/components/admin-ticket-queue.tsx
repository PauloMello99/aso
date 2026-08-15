"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { cn } from "@/shared/lib/utils"
import { useAdminOrgs } from "@/features/admin/hooks/use-admin"
import { useAdminTicketQueue } from "../hooks/use-admin-ticket-queue"
import { useTicketCategories } from "../hooks/use-ticket-categories"
import { isSlaBreached } from "../lib/ticket-sla"
import { TicketStatusBadge } from "./ticket-status-badge"
import type { TicketStatus } from "../schemas/ticket.schema"
import type { AdminTicketQueueFilter } from "../types"

const STATUS_OPTIONS: TicketStatus[] = [
  "open",
  "in_progress",
  "waiting_customer",
  "resolved",
  "closed",
]

const STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  waiting_customer: "Aguardando cliente",
  resolved: "Resolvido",
  closed: "Fechado",
}

const PAGE_SIZE = 20

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function AdminTicketQueue() {
  const [filters, setFilters] = React.useState<AdminTicketQueueFilter>({
    page: 1,
    pageSize: PAGE_SIZE,
  })
  const [assignError, setAssignError] = React.useState<string | null>(null)

  const { orgs } = useAdminOrgs()
  // Categorias de suporte são globais (não escopadas por org) — orgId aqui
  // só existe porque a rota é compartilhada com o portal do cliente (ver
  // comentário em `support.controller.ts`). Usamos a primeira org só para
  // satisfazer a assinatura da rota.
  const { categories } = useTicketCategories(orgs[0]?.id ?? "")

  const { tickets, total, loading, error, assignToMe, assigning } =
    useAdminTicketQueue(filters)
  // Contagem de órfãos para o badge do filtro — consulta separada (não a
  // `total` da fila atual, que reflete os filtros ativos, não o universo
  // de órfãos).
  const { total: orphanTotal } = useAdminTicketQueue({
    orphanOnly: true,
    page: 1,
    pageSize: PAGE_SIZE,
  })

  const orgNameById = React.useMemo(() => {
    const map = new Map<string, string>()
    orgs.forEach((org) => map.set(org.id, org.name))
    return map
  }, [orgs])

  const categoryLabelById = React.useMemo(() => {
    const map = new Map<string, string>()
    categories.forEach((c) => map.set(c.id, c.label))
    return map
  }, [categories])

  function handleStatus(value: string) {
    setFilters((prev) => ({
      ...prev,
      page: 1,
      status: value === "all" ? undefined : (value as TicketStatus),
    }))
  }

  function handleCategory(value: string) {
    setFilters((prev) => ({
      ...prev,
      page: 1,
      categoryId: value === "all" ? undefined : value,
    }))
  }

  function handleOrg(value: string) {
    setFilters((prev) => ({
      ...prev,
      page: 1,
      orgId: value === "all" || value === "none" ? undefined : value,
      orphanOnly: value === "none" ? true : undefined,
    }))
  }

  async function handleAssignToMe(ticketId: string) {
    setAssignError(null)
    try {
      await assignToMe(ticketId)
    } catch (err) {
      setAssignError(
        err instanceof Error ? err.message : "Falha ao atribuir chamado.",
      )
    }
  }

  function goTo(page: number) {
    setFilters((prev) => ({ ...prev, page }))
  }

  const currentPage = filters.page ?? 1
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Fila de suporte</h1>
        <p className="mt-0.5 text-sm text-foreground/50">
          Chamados de todas as organizações — atenda, responda e mude o status.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select onValueChange={handleStatus} defaultValue="all">
          <SelectTrigger className="h-8 w-44 text-sm">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select onValueChange={handleCategory} defaultValue="all">
          <SelectTrigger className="h-8 w-48 text-sm">
            <SelectValue placeholder="Todas as categorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select onValueChange={handleOrg} defaultValue="all">
          <SelectTrigger className="h-8 w-48 text-sm">
            <SelectValue placeholder="Todas as organizações" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as organizações</SelectItem>
            <SelectItem value="none">Sem organização</SelectItem>
            {orgs.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {orphanTotal > 0 && (
          <Badge variant="warning">
            {orphanTotal} sem organização
          </Badge>
        )}
      </div>

      {(error || assignError) && (
        <p className="text-sm text-destructive">{error ?? assignError}</p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-foreground/40">
          Carregando...
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-foreground/40">
          <Inbox className="h-8 w-8" />
          <p className="text-sm">Nenhum chamado encontrado.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-foreground/[0.06]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assunto</TableHead>
                  <TableHead>Organização</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead className="whitespace-nowrap">Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => {
                  const breached = isSlaBreached(ticket)
                  return (
                    <TableRow
                      key={ticket.id}
                      className={cn(breached && "bg-destructive/[0.04]")}
                    >
                      <TableCell className="max-w-[220px]">
                        <Link
                          href={`/admin/support/tickets/${ticket.id}`}
                          className="block truncate text-sm font-medium text-foreground hover:underline"
                        >
                          {ticket.subject}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">
                        {ticket.orgId ? (
                          (orgNameById.get(ticket.orgId) ?? ticket.orgId)
                        ) : (
                          <Badge variant="outline">Sem organização</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {categoryLabelById.get(ticket.categoryId) ?? "—"}
                      </TableCell>
                      <TableCell>
                        <TicketStatusBadge status={ticket.status} />
                      </TableCell>
                      <TableCell>
                        {breached ? (
                          <Badge variant="destructive-subtle">SLA vencido</Badge>
                        ) : (
                          <span className="text-xs text-foreground/30">—</span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-foreground/60">
                        {fmtDateTime(ticket.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7"
                          disabled={assigning}
                          onClick={() => void handleAssignToMe(ticket.id)}
                        >
                          Atribuir a mim
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-sm text-foreground/50">
            <span>
              {total} chamado{total !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={currentPage <= 1}
                onClick={() => goTo(currentPage - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={currentPage >= totalPages}
                onClick={() => goTo(currentPage + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
