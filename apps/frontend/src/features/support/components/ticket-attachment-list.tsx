"use client"

import { useState } from "react"
import { Paperclip } from "lucide-react"
import { formatFileSize } from "../lib/format-file-size"
import type { TicketAttachment } from "../schemas/ticket.schema"

interface TicketAttachmentListProps {
  attachments: TicketAttachment[]
  /** Resolve a URL assinada do anexo — varia por contexto: portal (escopado
   * por org, ver `getAttachmentUrl` em `support.api.ts`) ou admin (cross-org,
   * ver `getAdminTicketAttachmentUrl` em `admin-support.api.ts`), necessário
   * para tickets órfãos sem `orgId`. */
  getAttachmentUrl: (attachmentId: string) => Promise<{ url: string }>
}

export function TicketAttachmentList({
  attachments,
  getAttachmentUrl,
}: TicketAttachmentListProps) {
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleOpen(attachment: TicketAttachment) {
    setError(null)
    setOpeningId(attachment.id)
    try {
      // A `storagePath` do anexo nunca vem no payload — a URL assinada é
      // obtida sob demanda aqui e aberta diretamente, sem persistir estado.
      const { url } = await getAttachmentUrl(attachment.id)
      window.open(url, "_blank", "noopener,noreferrer")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao abrir anexo.")
    } finally {
      setOpeningId(null)
    }
  }

  if (attachments.length === 0) {
    return (
      <p className="text-xs text-foreground/30">Nenhum anexo neste chamado.</p>
    )
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-destructive">{error}</p>}
      <ul className="grid gap-1.5">
        {attachments.map((attachment) => (
          <li key={attachment.id}>
            <button
              type="button"
              disabled={openingId === attachment.id}
              onClick={() => void handleOpen(attachment)}
              className="flex w-full items-center gap-2 rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] px-3 py-2 text-left hover:bg-foreground/[0.04] disabled:opacity-50"
            >
              <Paperclip className="h-4 w-4 shrink-0 text-foreground/40" />
              <span className="min-w-0 flex-1 truncate text-sm text-foreground/70">
                {attachment.fileName}
              </span>
              <span className="shrink-0 text-xs text-foreground/30">
                {formatFileSize(attachment.sizeBytes)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
