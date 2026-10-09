"use client"

import * as React from "react"
import Link from "next/link"
import { Inbox } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { PaginationBar } from "@/shared/components/pagination-bar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { cn } from "@/shared/lib/utils"
import { useQuoteRequests } from "../hooks/use-quote-requests"
import { formatRelative } from "../lib/quote-dates"
import type { QuoteRequestListItem } from "../types"
import {
  NO_PROFESSIONAL_LABEL,
  QuoteRequestCard,
  formatImageCount,
} from "./quote-request-card"
import { QuoteUnavailableState } from "./quote-unavailable-state"

interface QuoteRequestListProps {
  orgId: string
  orgSlug: string
  isOwner: boolean
  selectedId: string | null
  onSelect: (id: string) => void
}

function ListSkeleton() {
  return (
    <div
      role="status"
      aria-label="Carregando pedidos"
      className="space-y-3"
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-24 animate-pulse rounded-xl border border-foreground/[0.06] bg-foreground/[0.02]"
        />
      ))}
    </div>
  )
}

function QuoteRequestRow({
  request,
  isOwner,
  selected,
  onSelect,
}: {
  request: QuoteRequestListItem
  isOwner: boolean
  selected: boolean
  onSelect: (id: string) => void
}) {
  const unread = !request.viewed

  function handleKeyDown(event: React.KeyboardEvent<HTMLTableRowElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onSelect(request.id)
    }
  }

  return (
    <TableRow
      role="button"
      tabIndex={0}
      aria-label={`Abrir pedido de ${request.requesterName}`}
      aria-current={selected ? "true" : undefined}
      onClick={() => onSelect(request.id)}
      onKeyDown={handleKeyDown}
      className={cn(
        "cursor-pointer hover:bg-foreground/[0.02] focus-visible:ring-2 focus-visible:ring-ring",
        selected && "bg-foreground/[0.04]",
      )}
    >
      <TableCell className="w-8 pl-4">
        {unread && (
          <>
            <span
              aria-hidden="true"
              className="block h-2 w-2 rounded-full bg-primary"
            />
            <span className="sr-only">Não lido</span>
          </>
        )}
      </TableCell>
      <TableCell
        className={cn(
          "max-w-[12rem] truncate",
          unread ? "font-semibold text-foreground" : "text-foreground/80",
        )}
      >
        {request.requesterName}
      </TableCell>
      <TableCell className="max-w-xs truncate text-foreground/60">
        {request.ideaPreview}
      </TableCell>
      <TableCell className="hidden text-foreground/40 lg:table-cell">
        {formatImageCount(request.imageCount)}
      </TableCell>
      {isOwner && (
        <TableCell>
          <Badge variant="outline" className="max-w-[10rem] truncate">
            {request.targetDisplayName ?? NO_PROFESSIONAL_LABEL}
          </Badge>
        </TableCell>
      )}
      <TableCell className="pr-4 text-foreground/40">
        {formatRelative(request.createdAt)}
      </TableCell>
    </TableRow>
  )
}

export function QuoteRequestList({
  orgId,
  orgSlug,
  isOwner,
  selectedId,
  onSelect,
}: QuoteRequestListProps) {
  const [page, setPage] = React.useState(1)
  const { data, loading, notFound, error, refetch } = useQuoteRequests(
    orgId,
    page,
  )

  // Página deixou de existir (ex.: pedidos expiraram): volta para a última.
  React.useEffect(() => {
    if (data && page > data.pages) setPage(data.pages)
  }, [data, page])

  if (notFound) return <QuoteUnavailableState />

  // Página vazia além da primeira: o efeito acima já está voltando de página.
  if (loading || (page > 1 && (data?.items.length ?? 0) === 0 && !error)) {
    return <ListSkeleton />
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          Não foi possível carregar os pedidos de orçamento.
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-11 sm:h-9"
          onClick={() => void refetch()}
        >
          Tentar novamente
        </Button>
      </div>
    )
  }

  const items = data?.items ?? []

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-foreground/[0.08] px-4 py-16 text-center">
        <Inbox className="mx-auto h-8 w-8 text-foreground/20" aria-hidden="true" />
        <p className="mt-3 text-sm font-medium text-foreground/60">
          Nenhum pedido de orçamento ainda
        </p>
        <p className="mx-auto mt-1 max-w-md text-sm text-foreground/40">
          Os pedidos chegam pelo link público do seu formulário de orçamento.
          Compartilhe o link no Instagram ou no WhatsApp para começar a receber.
        </p>
        <Button asChild variant="outline" className="mt-4 h-11 sm:h-10">
          <Link href={`/dashboard/org/${orgSlug}/settings/quote-form`}>
            Ir para Configurações &gt; Orçamento
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:hidden">
        {items.map((request) => (
          <QuoteRequestCard
            key={request.id}
            request={request}
            isOwner={isOwner}
            selected={request.id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>

      <div className="hidden overflow-x-auto overflow-y-hidden rounded-xl border border-foreground/[0.06] md:block">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-8 pl-4">
                <span className="sr-only">Situação</span>
              </TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Ideia</TableHead>
              <TableHead className="hidden lg:table-cell">Imagens</TableHead>
              {isOwner && <TableHead>Profissional</TableHead>}
              <TableHead className="pr-4">Recebido</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((request) => (
              <QuoteRequestRow
                key={request.id}
                request={request}
                isOwner={isOwner}
                selected={request.id === selectedId}
                onSelect={onSelect}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      <PaginationBar
        page={data?.page ?? page}
        pages={data?.pages ?? 1}
        total={data?.total ?? 0}
        onPageChange={setPage}
        itemLabel="pedido"
      />
    </div>
  )
}
