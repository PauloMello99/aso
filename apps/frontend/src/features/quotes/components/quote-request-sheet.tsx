"use client"

import * as React from "react"
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
import { cn } from "@/shared/lib/utils"
import {
  useMarkQuoteRequestViewed,
  useQuoteRequest,
} from "../hooks/use-quote-requests"
import { buildWhatsappUrl } from "../lib/build-whatsapp-url"
import { describeExpiry, formatRelative } from "../lib/quote-dates"
import type { QuoteRequestDetail } from "../types"
import { CopyableContact } from "./copyable-contact"
import { NO_PROFESSIONAL_LABEL } from "./quote-request-card"
import { QuoteImageGallery } from "./quote-image-gallery"

interface QuoteRequestSheetProps {
  orgId: string
  /** `null` = fechado. */
  id: string | null
  isOwner: boolean
  onClose: () => void
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

function DetailContent({
  detail,
  isOwner,
  onRefetch,
}: {
  detail: QuoteRequestDetail
  isOwner: boolean
  onRefetch: () => void
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
    </div>
  )
}

export function QuoteRequestSheet({
  orgId,
  id,
  isOwner,
  onClose,
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
              detail={data}
              isOwner={isOwner}
              onRefetch={handleRefetch}
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
