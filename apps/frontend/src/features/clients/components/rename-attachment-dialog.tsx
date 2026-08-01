"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
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

interface RenameAttachmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentName: string
  onSave: (baseName: string) => Promise<void>
}

export function RenameAttachmentDialog({
  open,
  onOpenChange,
  currentName,
  onSave,
}: RenameAttachmentDialogProps) {
  const { base: currentBase, ext } = splitFileName(currentName)
  const [baseName, setBaseName] = useState(currentBase)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setBaseName(currentBase)
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only on open/currentName transitions
  }, [open, currentName])

  async function handleSubmit() {
    const trimmed = baseName.trim()
    if (!trimmed) return
    setSaving(true)
    setError(null)
    try {
      await onSave(trimmed)
      onOpenChange(false)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível renomear o anexo.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Renomear anexo</DialogTitle>
          <DialogDescription>
            Escolha um novo nome para este arquivo. A extensão é mantida.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="rename-attachment-name">
            Nome <span className="text-destructive">*</span>
          </Label>
          <div className="flex items-center gap-1.5">
            <Input
              id="rename-attachment-name"
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
            disabled={!baseName.trim() || saving}
            onClick={() => void handleSubmit()}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
