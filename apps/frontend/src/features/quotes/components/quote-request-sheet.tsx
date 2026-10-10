"use client"

import * as React from "react"
import { ApiError } from "@/infrastructure/api/client"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet"
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog"
import { cn } from "@/shared/lib/utils"
import {
  isQuoteAlreadyResolvedError,
  useDeclineQuoteRequest,
  useMarkQuoteRequestViewed,
  useQuoteRequest,
} from "../hooks/use-quote-requests"
import { buildWhatsappUrl } from "../lib/build-whatsapp-url"
import { describeExpiry, formatRelative } from "../lib/quote-dates"
import type { QuoteRequestDetail } from "../types"
import { CopyableContact } from "./copyable-contact"
import { NO_PROFESSIONAL_LABEL } from "./quote-request-card"
import { QuoteImageGallery } from "./quote-image-gallery"
import {
  QUOTE_ALREADY_RESOLVED_MESSAGE,
  ScheduleQuoteDialog,
} from "./schedule-quote-dialog"

interface QuoteRequestSheetProps {
  orgId: string
  /** `null` = fechado. */
  id: string | null
  isOwner: boolean
  /** Usuário tem o módulo 'schedule' (o backend revalida). */
  canSchedule: boolean
  onClose: () => void
  /** Pedido respondido: a página fecha o Sheet e exibe a mensagem. */
  onResolved: (message: string) => void
}

const SECTION_LABEL_CLASS =
  "text-xs uppercase tracking-widest text-foreground/25"

function DetailSkeleton() {
  return (
    <div
      role="status"
      aria-label="Carregando pedido"
      className="space-y-6 pb-6"
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

function WhatsappAction({ phone }: { phone: string | null }) {
  const url = buildWhatsappUrl(phone)
  if (!url) {
    return (
      <Button size="lg" className="w-full sm:w-auto" disabled>
        Contato indisponível
      </Button>
    )
  }
  return (
    <Button size="lg" className="w-full sm:w-auto" asChild>
      <a href={url} target="_blank" rel="noopener noreferrer">
        Responder no WhatsApp
        <span className="sr-only"> (abre em nova aba)</span>
      </a>
    </Button>
  )
}

function describeDeclineError(error: unknown): string {
  if (error instanceof ApiError && error.status === 403) {
    return "Você não pode responder este pedido."
  }
  return "Não foi possível encerrar o pedido. Tente novamente."
}

function ResponseActions({
  orgId,
  detail,
  isOwner,
  canSchedule,
  onResolved,
}: {
  orgId: string
  detail: QuoteRequestDetail
  isOwner: boolean
  canSchedule: boolean
  onResolved: (message: string) => void
}) {
  const [scheduleOpen, setScheduleOpen] = React.useState(false)
  const [declineOpen, setDeclineOpen] = React.useState(false)
  const [declineError, setDeclineError] = React.useState<string | null>(null)
  const { decline, isPending, reset } = useDeclineQuoteRequest(orgId)

  function handleDeclineOpenChange(open: boolean) {
    setDeclineOpen(open)
    if (open) {
      setDeclineError(null)
      reset()
    }
  }

  async function handleDecline() {
    setDeclineError(null)
    try {
      await decline(detail.id)
      setDeclineOpen(false)
      onResolved("Pedido encerrado sem agendamento.")
    } catch (error) {
      if (isQuoteAlreadyResolvedError(error)) {
        setDeclineOpen(false)
        onResolved(QUOTE_ALREADY_RESOLVED_MESSAGE)
        return
      }
      setDeclineError(describeDeclineError(error))
    }
  }

  // Owner sem profissional-alvo identificado: não há agenda a nomear.
  const showSchedule = canSchedule && !(isOwner && !detail.targetDisplayName)

  const declineDescription =detail.contactRetentionAccepted
    ? "O pedido sai da caixa de entrada e as imagens são apagadas agora. Como o cliente autorizou, nome, telefone, e-mail e a descrição do pedido ficam retidos por até 30 dias e depois apagados automaticamente. Esta ação não pode ser desfeita."
    : "O pedido e as imagens são apagados agora. Esta ação não pode ser desfeita."

  return (
    <section className="space-y-2">
      <h3 className={SECTION_LABEL_CLASS}>Resultado do contato</h3>
      <p className="text-xs text-foreground/40">
        Depois de conversar com o cliente, registre o resultado.
      </p>
      <div className={cn("grid gap-2", showSchedule ? "grid-cols-2" : "grid-cols-1")}>
        {showSchedule && (
          <Button
            type="button"
            className="h-11 sm:h-9"
            onClick={() => setScheduleOpen(true)}
          >
            Agendou
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          className="h-11 sm:h-9"
          onClick={() => handleDeclineOpenChange(true)}
        >
          Não agendou
        </Button>
      </div>

      <ScheduleQuoteDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        orgId={orgId}
        requestId={detail.id}
        assigneeName={isOwner ? detail.targetDisplayName : null}
        onResolved={onResolved}
      />

      <ConfirmDialog
        open={declineOpen}
        onOpenChange={handleDeclineOpenChange}
        title="Encerrar sem agendamento?"
        description={declineDescription}
        confirmLabel="Encerrar pedido"
        destructive
        loading={isPending}
        error={declineError}
        onConfirm={() => void handleDecline()}
      />
    </section>
  )
}

function DetailContent({
  orgId,
  detail,
  isOwner,
  canSchedule,
  onRefetch,
  onResolved,
}: {
  orgId: string
  detail: QuoteRequestDetail
  isOwner: boolean
  canSchedule: boolean
  onRefetch: () => void
  onResolved: (message: string) => void
}) {
  const expiry = describeExpiry(detail.expiresAt)
  const professional = detail.targetDisplayName ?? NO_PROFESSIONAL_LABEL

  return (
    <div className="space-y-6 pb-6">
      <section className="space-y-2">
        <h3 className={SECTION_LABEL_CLASS}>Ideia</h3>
        <p className="whitespace-pre-wrap break-words text-base text-foreground/90 sm:text-sm">
          {detail.idea}
        </p>
      </section>

      <section className="space-y-2">
        <h3 className={SECTION_LABEL_CLASS}>Imagens de referência</h3>
        <QuoteImageGallery
          images={detail.images}
          imagesUnavailable={detail.imagesUnavailable}
          onRefetch={onRefetch}
        />
      </section>

      <section className="space-y-1">
        <h3 className={SECTION_LABEL_CLASS}>Contato</h3>
        <CopyableContact kind="tel" value={detail.requesterPhone} />
        <CopyableContact kind="mailto" value={detail.requesterEmail} />
      </section>

      {isOwner && (
        <section className="space-y-1">
          <h3 className={SECTION_LABEL_CLASS}>Profissional</h3>
          <p className="break-words text-base text-foreground/90 sm:text-sm">
            {professional}
          </p>
        </section>
      )}

      <section className="space-y-2">
        <Badge
          variant={expiry.tone === "destructive" ? "destructive-subtle" : expiry.tone}
        >
          {expiry.label}
        </Badge>
        <p className="text-xs text-foreground/40">
          Por privacidade, os dados de contato são apagados automaticamente após
          a expiração.
        </p>
      </section>

      <ResponseActions
        orgId={orgId}
        detail={detail}
        isOwner={isOwner}
        canSchedule={canSchedule}
        onResolved={onResolved}
      />
    </div>
  )
}

export function QuoteRequestSheet({
  orgId,
  id,
  isOwner,
  canSchedule,
  onClose,
  onResolved,
}: QuoteRequestSheetProps) {
  const { data, loading, notFound, error, refetch } = useQuoteRequest(orgId, id)
  const { markViewed } = useMarkQuoteRequestViewed(orgId)
  const markedIdsRef = React.useRef<Set<string>>(new Set())

  // Marca como lido uma única vez por pedido, só depois de o detalhe carregar.
  // Falha silenciosa: o próximo poll/refetch reconcilia contador e lista.
  React.useEffect(() => {
    if (!data || data.viewed) return
    if (markedIdsRef.current.has(data.id)) return
    markedIdsRef.current.add(data.id)
    markViewed(data.id)
  }, [data, markViewed])

  // 404 do ?id=: a mensagem fica visível no Sheet; fechar (botão ou X) remove o ?id.
  function handleRefetch() {
    void refetch()
  }

  const whatsappPhone = data?.requesterPhone ?? null

  return (
    <Sheet open={id !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right">
        <SheetHeader className="pr-10">
          <SheetTitle className={cn(!data && "sr-only")}>
            {data ? data.requesterName : "Pedido de orçamento"}
          </SheetTitle>
          <SheetDescription className={cn(!data && "sr-only")}>
            {data
              ? `Recebido ${formatRelative(data.createdAt)} · ${describeExpiry(data.expiresAt).label.toLowerCase()}`
              : "Detalhes do pedido de orçamento"}
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          {loading ? (
            <DetailSkeleton />
          ) : notFound ? (
            <p className="py-6 text-sm text-foreground/60">
              Pedido não encontrado ou expirado.
            </p>
          ) : error ? (
            <div className="space-y-3 py-6">
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                Não foi possível carregar o pedido.
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-11 sm:h-9"
                onClick={handleRefetch}
              >
                Tentar novamente
              </Button>
            </div>
          ) : data ? (
            <DetailContent
              orgId={orgId}
              detail={data}
              isOwner={isOwner}
              canSchedule={canSchedule}
              onRefetch={handleRefetch}
              onResolved={onResolved}
            />
          ) : null}
        </SheetBody>

        <SheetFooter>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
            onClick={onClose}
          >
            Fechar
          </Button>
          {data ? <WhatsappAction phone={whatsappPhone} /> : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
