"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/router"
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
import { useTickets } from "../hooks/use-tickets"
import { useTicketCategories } from "../hooks/use-ticket-categories"
import { TicketStatusBadge } from "./ticket-status-badge"
import type { Ticket, TicketStatus } from "../schemas/ticket.schema"
import type { TicketsFilter } from "../types"

interface TicketListProps {
  orgId: string
  orgSlug: string
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function TicketCard({
  ticket,
  categoryLabel,
  onOpen,
}: {
  ticket: Ticket
  categoryLabel: string
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4 text-left transition-colors hover:bg-foreground/[0.04]"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0 flex-1 truncate font-medium text-foreground">
          {ticket.subject}
        </span>
        <TicketStatusBadge status={ticket.status} />
      </div>
      <div className="mt-1 flex flex-col gap-1 text-sm text-foreground/40">
        <span>{categoryLabel}</span>
        <span>{formatDate(ticket.createdAt)}</span>
      </div>
    </button>
  )
}

function TicketRow({
  ticket,
  categoryLabel,
  onOpen,
}: {
  ticket: Ticket
  categoryLabel: string
  onOpen: () => void
}) {
  return (
    <TableRow
      onClick={onOpen}
      className="cursor-pointer hover:bg-foreground/[0.02]"
    >
      <TableCell className="pl-4 font-medium text-foreground">
        {ticket.subject}
      </TableCell>
      <TableCell>
        <TicketStatusBadge status={ticket.status} />
      </TableCell>
      <TableCell className="text-foreground/40">{categoryLabel}</TableCell>
      <TableCell className="pr-4 text-foreground/40">
        {formatDate(ticket.createdAt)}
      </TableCell>
    </TableRow>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-xl border border-foreground/[0.06] bg-foreground/[0.02]"
        />
      ))}
    </div>
  )
}

export function TicketList({ orgId, orgSlug }: TicketListProps) {
  const router = useRouter()
  const [status, setStatus] = useState<TicketStatus | undefined>(undefined)
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined)

  const filter = useMemo<TicketsFilter | undefined>(() => {
    const f: TicketsFilter = {}
    if (status) f.status = status
    if (categoryId) f.categoryId = categoryId
    return Object.keys(f).length ? f : undefined
  }, [status, categoryId])

  const { tickets, loading, error } = useTickets(orgId, filter)
  const { categories } = useTicketCategories(orgId)

  const categoryLabelById = useMemo(
    () => new Map(categories.map((c) => [c.id, c.label])),
    [categories],
  )

  function categoryLabelFor(ticket: Ticket): string {
    return categoryLabelById.get(ticket.categoryId) ?? "—"
  }

  function openDetail(ticket: Ticket) {
    void router.push(`/dashboard/org/${orgSlug}/support/${ticket.id}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select
          value={status ?? "all"}
          onValueChange={(v) =>
            setStatus(v === "all" ? undefined : (v as TicketStatus))
          }
        >
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="open">Aberto</SelectItem>
            <SelectItem value="in_progress">Em andamento</SelectItem>
            <SelectItem value="waiting_customer">Aguardando cliente</SelectItem>
            <SelectItem value="resolved">Resolvido</SelectItem>
            <SelectItem value="closed">Fechado</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={categoryId ?? "all"}
          onValueChange={(v) => setCategoryId(v === "all" ? undefined : v)}
        >
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="Categoria" />
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
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <ListSkeleton />
      ) : tickets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-foreground/[0.08] py-16 text-center">
          <p className="text-sm text-foreground/30">
            Nenhum chamado encontrado.
          </p>
          <p className="mt-1 text-xs text-foreground/20">
            Clique em &quot;Abrir chamado&quot; para criar o primeiro.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {tickets.map((t) => (
              <TicketCard
                key={t.id}
                ticket={t}
                categoryLabel={categoryLabelFor(t)}
                onOpen={() => openDetail(t)}
              />
            ))}
          </div>

          <div className="hidden rounded-xl border border-foreground/[0.06] md:block">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Assunto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="pr-4">Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((t) => (
                  <TicketRow
                    key={t.id}
                    ticket={t}
                    categoryLabel={categoryLabelFor(t)}
                    onOpen={() => openDetail(t)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  )
}
