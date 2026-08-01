"use client"

import { useEffect, useState } from "react"
import { FileText, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { splitFileName } from "@/shared/lib/file-name"

interface UploadAttachmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: File | null
  onConfirm: (file: File, baseName?: string) => Promise<void>
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function UploadAttachmentDialog({
  open,
  onOpenChange,
  file,
  onConfirm,
}: UploadAttachmentDialogProps) {
  const [baseName, setBaseName] = useState("")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isImage = file?.type.startsWith("image/") ?? false
  const ext = file ? splitFileName(file.name).ext : ""

  useEffect(() => {
    if (open && file) {
      setBaseName(splitFileName(file.name).base)
      setError(null)
    }
  }, [open, file])

  useEffect(() => {
    if (!open || !file || !isImage) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [open, file, isImage])

  async function handleSubmit() {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      await onConfirm(file, baseName)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no envio.")
    } finally {
      setUploading(false)
    }
  }

  if (!file) return null

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !uploading && onOpenChange(o)}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Enviar anexo</DialogTitle>
          <DialogDescription>
            Revise o nome antes de enviar. A extensão é mantida.
          </DialogDescription>
        </DialogHeader>

        <div className="flex h-32 items-center justify-center overflow-hidden rounded-lg border border-foreground/[0.06] bg-foreground/[0.02]">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt={file.name}
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-foreground/40">
              <FileText className="h-6 w-6" />
              <span className="text-xs">{formatBytes(file.size)}</span>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="upload-attachment-name">Nome</Label>
          <div className="flex items-center gap-1.5">
            <Input
              id="upload-attachment-name"
              value={baseName}
              onChange={(e) => setBaseName(e.target.value)}
              autoFocus
              autoComplete="off"
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  void handleSubmit()
                }
              }}
            />
            {ext && (
              <span className="shrink-0 text-sm text-foreground/40">
                {ext}
              </span>
            )}
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter showCloseButton>
          <Button
            type="button"
            disabled={uploading}
            onClick={() => void handleSubmit()}
          >
            {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
