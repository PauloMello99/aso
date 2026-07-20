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
import type { ServiceType } from "../types"

interface EditServiceTypeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceType: ServiceType
  onSave: (
    id: string,
    data: { name?: string; description?: string | null },
  ) => Promise<ServiceType>
  onSaved?: (type: ServiceType) => void
}

export function EditServiceTypeDialog({
  open,
  onOpenChange,
  serviceType,
  onSave,
  onSaved,
}: EditServiceTypeDialogProps) {
  const [name, setName] = useState(serviceType.name)
  const [description, setDescription] = useState(
    serviceType.description ?? "",
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName(serviceType.name)
      setDescription(serviceType.description ?? "")
      setError(null)
    }
  }, [open, serviceType])

  async function handleSubmit() {
    const trimmed = name.trim()
    if (!trimmed) return
    setSaving(true)
    setError(null)
    try {
      const updated = await onSave(serviceType.id, {
        name: trimmed,
        description: description.trim() || null,
      })
      onSaved?.(updated)
      onOpenChange(false)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar as alterações.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar tipo de serviço</DialogTitle>
          <DialogDescription>
            Atualize o nome ou a descrição deste tipo de serviço.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="edit-service-type-name">
            Nome <span className="text-destructive">*</span>
          </Label>
          <Input
            id="edit-service-type-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Tatuagem"
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

        <div className="space-y-1.5">
          <Label htmlFor="edit-service-type-description">Descrição</Label>
          <Input
            id="edit-service-type-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Opcional"
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                void handleSubmit()
              }
            }}
          />
        </div>

        <DialogFooter showCloseButton>
          <Button
            type="button"
            disabled={!name.trim() || saving}
            onClick={() => void handleSubmit()}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
