"use client"

import { useRef, useState } from "react"
import { ImagePlus, Loader2, Trash2 } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import {
  FilePreviewDialog,
  type PreviewFile,
} from "@/shared/components/file-preview-dialog"
import { cn } from "@/shared/lib/utils"
import { useServiceMedia, type ServiceMedia } from "../hooks/use-service-media"

interface ServiceMediaSectionProps {
  orgId: string
  serviceId: string
  readOnly?: boolean
}

const MAX_PHOTOS = 3
const MAX_BYTES = 300 * 1024
const ACCEPTED_TYPES = "image/png,image/jpeg,image/webp"

function toPreviewFile(m: ServiceMedia): PreviewFile {
  return {
    id: m.id,
    fileName: m.fileName,
    contentType: m.contentType,
    url: m.url,
    downloadUrl: m.downloadUrl,
  }
}

export function ServiceMediaSection({
  orgId,
  serviceId,
  readOnly = false,
}: ServiceMediaSectionProps) {
  const { media, loading, uploadMedia, deleteMedia } = useServiceMedia(
    orgId,
    serviceId,
  )
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  const atLimit = media.length >= MAX_PHOTOS
  const previewIndex = media.findIndex((m) => m.id === previewId)

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setError(null)
    if (file.size > MAX_BYTES) {
      setError("Imagem deve ter no máximo 300 KB.")
      return
    }
    setUploading(true)
    try {
      await uploadMedia(file)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no envio.")
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id: string) {
    setError(null)
    setDeletingId(id)
    try {
      await deleteMedia(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao remover.")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-medium text-foreground/70">
          <ImagePlus className="h-3.5 w-3.5" /> Fotos
          <span className="text-xs font-normal text-foreground/30">
            ({media.length}/{MAX_PHOTOS})
          </span>
        </span>
        {!readOnly && !atLimit && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_TYPES}
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
                <ImagePlus className="h-4 w-4" />
              )}
              Enviar
            </Button>
          </>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {loading ? (
        <p className="text-xs text-foreground/30">Carregando…</p>
      ) : media.length === 0 ? (
        <p className="text-xs text-foreground/30">
          Nenhuma foto. PNG, JPEG ou WebP até 300 KB (máx. {MAX_PHOTOS}).
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-2">
          {media.map((m) => (
            <li
              key={m.id}
              className="group relative aspect-square overflow-hidden rounded-lg border border-foreground/[0.06] bg-foreground/[0.02]"
            >
              <button
                type="button"
                onClick={() => {
                  setPreviewId(m.id)
                  setPreviewOpen(true)
                }}
                className="block h-full w-full"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.url}
                  alt={m.fileName}
                  className="h-full w-full object-cover"
                />
              </button>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => handleDelete(m.id)}
                  disabled={deletingId === m.id}
                  title="Remover"
                  className={cn(
                    "absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white/80 hover:text-destructive",
                    "opacity-100 sm:opacity-0 sm:group-hover:opacity-100",
                  )}
                >
                  {deletingId === m.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {previewIndex >= 0 && (
        <FilePreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          files={media.map(toPreviewFile)}
          startIndex={previewIndex}
        />
      )}
    </div>
  )
}
