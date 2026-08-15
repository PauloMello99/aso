"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Separator } from "@/shared/components/ui/separator"
import { getAttachmentUrl } from "../api/support.api"
import { useTicket } from "../hooks/use-ticket-detail"
import { useTicketCategories } from "../hooks/use-ticket-categories"
import { TicketAttachmentList } from "./ticket-attachment-list"
import { TicketResponseForm } from "./ticket-response-form"
import { TicketStatusBadge } from "./ticket-status-badge"
import { TicketThread } from "./ticket-thread"

interface TicketDetailPageProps {
  orgId: string
  orgSlug: string
  ticketId: string | undefined
  routerReady: boolean
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function BackLink({ orgSlug }: { orgSlug: string }) {
  return (
    <Link
      href={`/dashboard/org/${orgSlug}/support`}
      className="inline-flex items-center gap-1.5 text-sm text-foreground/50 transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> Suporte
    </Link>
  )
}

export function TicketDetailPage({
  orgId,
  orgSlug,
  ticketId,
  routerReady,
}: TicketDetailPageProps) {
  const {
    ticket,
    responses,
    attachments,
    loading,
    error,
    addResponse,
    addingResponse,
    reopenTicket,
    reopening,
    uploadAttachment,
    uploadingAttachment,
  } = useTicket(orgId, ticketId)
  const { categories } = useTicketCategories(orgId)
  const [reopenError, setReopenError] = useState<string | null>(null)

  const categoryLabel = useMemo(() => {
    if (!ticket) return "—"
    return categories.find((c) => c.id === ticket.categoryId)?.label ?? "—"
  }, [categories, ticket])

  async function handleReopen() {
    setReopenError(null)
    try {
      await reopenTicket()
    } catch (err) {
      setReopenError(
        err instanceof Error ? err.message : "Falha ao reabrir chamado.",
      )
    }
  }

  if (!routerReady || loading) {
    return (
      <div className="space-y-6">
        <BackLink orgSlug={orgSlug} />
        <div className="flex items-center justify-center py-16 text-foreground/30">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="space-y-4">
        <BackLink orgSlug={orgSlug} />
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          Chamado não encontrado.
        </div>
      </div>
    )
  }

  const canReopen = ticket.status === "resolved" || ticket.status === "closed"

  return (
    <div className="space-y-6">
      <BackLink orgSlug={orgSlug} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-xl font-semibold text-foreground">
              {ticket.subject}
            </h1>
            <TicketStatusBadge status={ticket.status} />
          </div>
          <div className="mt-1 flex flex-col gap-1 text-sm text-foreground/40 sm:flex-row sm:gap-3">
            <span>{categoryLabel}</span>
            <span>Aberto em {formatDate(ticket.createdAt)}</span>
          </div>
        </div>
        {canReopen && (
          <Button
            variant="outline"
            onClick={() => void handleReopen()}
            disabled={reopening}
            className="w-full sm:w-auto"
          >
            {reopening ? "Reabrindo…" : "Reabrir chamado"}
          </Button>
        )}
      </div>

      {reopenError && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {reopenError}
        </div>
      )}

      <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4">
        <p className="text-xs text-foreground/40">Descrição</p>
        <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
          {ticket.description}
        </p>
      </div>

      <Separator className="bg-foreground/[0.06]" />

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">Mensagens</h2>
        <TicketThread responses={responses} />
        {!canReopen && (
          <TicketResponseForm
            onSubmitResponse={addResponse}
            submitting={addingResponse}
            onUploadAttachment={uploadAttachment}
            uploading={uploadingAttachment}
          />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">Anexos</h2>
        <TicketAttachmentList
          attachments={attachments}
          getAttachmentUrl={(attachmentId) =>
            getAttachmentUrl(orgId, attachmentId)
          }
        />
      </section>
    </div>
  )
}
