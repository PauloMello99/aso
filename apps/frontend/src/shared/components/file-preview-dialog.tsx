"use client"

import { useEffect, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Maximize2,
  Minimize2,
  Pencil,
  Trash2,
} from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { cn } from "@/shared/lib/utils"

export interface PreviewFile {
  id: string
  fileName: string
  contentType: string | null
  url: string
  downloadUrl?: string
}

interface FilePreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  files: PreviewFile[]
  startIndex: number
  onDownload?: (file: PreviewFile) => void
  onRename?: (file: PreviewFile) => void
  onRemove?: (file: PreviewFile) => void
}

export function FilePreviewDialog({
  open,
  onOpenChange,
  files,
  startIndex,
  onDownload,
  onRename,
  onRemove,
}: FilePreviewDialogProps) {
  const [index, setIndex] = useState(startIndex)
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    if (open) {
      setIndex(startIndex)
      setFullscreen(false)
    }
  }, [open, startIndex])

  const file = files[index]

  useEffect(() => {
    if (!open || files.length <= 1) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        setIndex((i) => (i - 1 + files.length) % files.length)
      } else if (e.key === "ArrowRight") {
        setIndex((i) => (i + 1) % files.length)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, files.length])

  if (!file) return null

  const isImage = file.contentType?.startsWith("image/") ?? false
  const isPdf = file.contentType === "application/pdf"
  const downloadHref = file.downloadUrl ?? file.url

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          "flex flex-col gap-3 sm:max-w-4xl",
          fullscreen && "max-w-none sm:max-w-none w-screen h-[100dvh] rounded-none p-4",
        )}
      >
        <DialogTitle className="truncate pr-8 text-sm">
          {file.fileName}
        </DialogTitle>

        <div
          className={cn(
            "relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg bg-foreground/[0.03]",
            fullscreen ? "h-full" : "h-[60vh] sm:h-[65vh]",
          )}
        >
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={file.url}
              alt={file.fileName}
              className="h-full w-full object-contain"
            />
          ) : isPdf ? (
            <iframe
              src={file.url}
              title={file.fileName}
              className="h-full w-full border-0"
            />
          ) : (
            <p className="p-6 text-center text-sm text-foreground/50">
              Não é possível pré-visualizar este arquivo.
            </p>
          )}

          {files.length > 1 && (
            <>
              <button
                type="button"
                onClick={() =>
                  setIndex((i) => (i - 1 + files.length) % files.length)
                }
                aria-label="Arquivo anterior"
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white/90 hover:bg-black/70"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIndex((i) => (i + 1) % files.length)}
                aria-label="Próximo arquivo"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white/90 hover:bg-black/70"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {isPdf && (
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 self-start text-xs text-foreground/50 hover:text-foreground hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Abrir em nova aba
          </a>
        )}

        <DialogFooter className="items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFullscreen((f) => !f)}
            >
              {fullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
            {onRename && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onRename(file)}
              >
                <Pencil className="h-4 w-4" /> Renomear
              </Button>
            )}
            {onRemove && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onRemove(file)}
              >
                <Trash2 className="h-4 w-4" /> Remover
              </Button>
            )}
          </div>
          <Button asChild variant="default" size="sm">
            <a
              href={downloadHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onDownload?.(file)}
            >
              <Download className="h-4 w-4" /> Baixar
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
