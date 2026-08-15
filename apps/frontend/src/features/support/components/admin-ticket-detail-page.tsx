"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Separator } from "@/shared/components/ui/separator"
import { useAdminOrgs } from "@/features/admin/hooks/use-admin"
import { getAdminTicketAttachmentUrl } from "../api/admin-support.api"
import { useAdminTicketDetail } from "../hooks/use-admin-ticket-detail"
import { useTicketCategories } from "../hooks/use-ticket-categories"
import { useAdminTicketActions } from "../hooks/use-admin-ticket-actions"
import { AdminTicketResponseForm } from "./admin-ticket-response-form"
import { AdminTicketStatusSelect } from "./admin-ticket-status-select"
import { LinkTicketOrgDialog } from "./link-ticket-org-dialog"
import { TicketAttachmentList } from "./ticket-attachment-list"
import { TicketStatusBadge } from "./ticket-status-badge"
import { TicketThread } from "./ticket-thread"
import type { ChangeableTicketStatus } from "../schemas/ticket.schema"

interface AdminTicketDetailPageProps {
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

function BackLink() {
  return (
    <Link
      href="/admin/support"
      className="inline-flex items-center gap-1.5 text-sm text-foreground/50 transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> Fila de suporte
    </Link>
  )
}

export function AdminTicketDetailPage({
  ticketId,
  routerReady,
}: AdminTicketDetailPageProps) {
  const { ticket, responses, attachments, loading, error } =
    useAdminTicketDetail(ticketId)
  const { orgs } = useAdminOrgs()
  // Categorias de suporte são globais (não escopadas por org) — mesma
  // ressalva documentada em `admin-ticket-queue.tsx`: passamos a primeira
  // org só para satisfazer a assinatura da rota. Não usar `ticket.orgId`
  // aqui, pois tickets órfãos ficariam sem categoria (`useTicketCategories`
  // não dispara a query com `orgId` vazio).
  const { categories } = useTicketCategories(orgs[0]?.id ?? "")
  const {
    respond,
    responding,
    changeStatus,
    changingStatus,
    linkOrganization,
    linkingOrganization,
  } = useAdminTicketActions(ticketId)
  const [actionError, setActionError] = useState<string | null>(null)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)

  const categoryLabel = useMemo(() => {
    if (!ticket) return "—"
    return categories.find((c) => c.id === ticket.categoryId)?.label ?? "—"
  }, [categories, ticket])

  async function handleRespond(body: string, isInternalNote: boolean) {
    setActionError(null)
    try {
      await respond(body, isInternalNote)
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Falha ao enviar resposta.",
      )
      throw err
    }
  }

  async function handleChangeStatus(status: ChangeableTicketStatus) {
    setActionError(null)
    try {
      await changeStatus(status)
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Falha ao mudar status.",
      )
    }
  }

  async function handleLinkOrganization(targetOrgId: string) {
    if (!ticketId) return
    setLinkError(null)
    try {
      await linkOrganization(ticketId, targetOrgId)
      setLinkDialogOpen(false)
    } catch (err) {
      setLinkError(
        err instanceof Error ? err.message : "Falha ao vincular organização.",
      )
    }
  }

  if (!routerReady || loading) {
    return (
      <div className="space-y-6">
        <BackLink />
        <div className="flex items-center justify-center py-16 text-foreground/30">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          Chamado não encontrado.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <BackLink />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-xl font-semibold text-foreground">
              {ticket.subject}
            </h1>
            <TicketStatusBadge status={ticket.status} />
            {ticket.orgId === null && (
              <Badge variant="outline">Sem organização</Badge>
            )}
          </div>
          <div className="mt-1 flex flex-col gap-1 text-sm text-foreground/40 sm:flex-row sm:gap-3">
            <span>{categoryLabel}</span>
            <span>{ticket.requesterName}</span>
            <span>Aberto em {formatDate(ticket.createdAt)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:items-end">
          <AdminTicketStatusSelect
            status={ticket.status}
            disabled={changingStatus}
            onChange={(status) => void handleChangeStatus(status)}
          />
          {ticket.orgId === null && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLinkDialogOpen(true)}
            >
              Vincular a uma organização
            </Button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {actionError}
        </div>
      )}

      <LinkTicketOrgDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        loading={linkingOrganization}
        error={linkError}
        onConfirm={(targetOrgId) => void handleLinkOrganization(targetOrgId)}
      />

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
        <AdminTicketResponseForm
          onSubmitResponse={handleRespond}
          submitting={responding}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">Anexos</h2>
        <TicketAttachmentList
          attachments={attachments}
          getAttachmentUrl={getAdminTicketAttachmentUrl}
        />
      </section>
    </div>
  )
}
