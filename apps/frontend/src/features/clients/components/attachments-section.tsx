"use client"

import { useRef, useState } from "react"
import { FileText, Loader2, Paperclip, Trash2, Upload } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { useCustomerAttachments } from "../hooks/use-customer-attachments"

interface AttachmentsSectionProps {
  orgId: string
  customerId: string
}

const MAX_BYTES = 10 * 1024 * 1024

export function AttachmentsSection({ orgId, customerId }: AttachmentsSectionProps) {
  const { attachments, loading, uploadAttachment, deleteAttachment } =
    useCustomerAttachments(orgId, customerId)
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setError(null)
    if (file.size > MAX_BYTES) {
      setError("Arquivo deve ter no máximo 10 MB.")
      return
    }
    setUploading(true)
    try {
      await uploadAttachment(file)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no envio.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-medium text-white/70">
          <Paperclip className="h-3.5 w-3.5" /> Anexos
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
          className="hidden"
          onChange={handleChange}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Enviar
        </Button>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {loading ? (
        <p className="text-xs text-white/30">Carregando…</p>
      ) : attachments.length === 0 ? (
        <p className="text-xs text-white/30">
          Nenhum anexo. Imagens ou PDF até 10 MB (ex.: ficha de anamnese).
        </p>
      ) : (
        <ul className="grid gap-1.5">
          {attachments.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
            >
              <FileText className="h-4 w-4 shrink-0 text-white/40" />
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 truncate text-sm text-white/70 hover:text-white hover:underline"
              >
                {a.fileName}
              </a>
              <button
                type="button"
                onClick={() => deleteAttachment(a.id)}
                className="shrink-0 text-white/30 hover:text-red-400"
                title="Remover"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
