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

interface RenameAttachmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentName: string
  onSave: (fileName: string) => Promise<void>
}

export function RenameAttachmentDialog({
  open,
  onOpenChange,
  currentName,
  onSave,
}: RenameAttachmentDialogProps) {
  const [fileName, setFileName] = useState(currentName)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setFileName(currentName)
      setError(null)
    }
  }, [open, currentName])

  async function handleSubmit() {
    const trimmed = fileName.trim()
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
            Escolha um novo nome para este arquivo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="rename-attachment-name">
            Nome <span className="text-destructive">*</span>
          </Label>
          <Input
            id="rename-attachment-name"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            autoFocus
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                void handleSubmit()
              }
            }}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter showCloseButton>
          <Button
            type="button"
            disabled={!fileName.trim() || saving}
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
