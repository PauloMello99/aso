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
import { Switch } from "@/shared/components/ui/switch"
import type { ServiceType } from "../types"

interface ServiceTypeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (
    name: string,
    requiresAgeVerification: boolean,
  ) => Promise<ServiceType>
  onCreated?: (type: ServiceType) => void
}

export function ServiceTypeDialog({
  open,
  onOpenChange,
  onCreate,
  onCreated,
}: ServiceTypeDialogProps) {
  const [name, setName] = useState("")
  const [requiresAgeVerification, setRequiresAgeVerification] =
    useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName("")
      setRequiresAgeVerification(false)
      setError(null)
    }
  }, [open])

  async function handleSubmit() {
    const trimmed = name.trim()
    if (!trimmed) return
    setSaving(true)
    setError(null)
    try {
      const created = await onCreate(trimmed, requiresAgeVerification)
      onCreated?.(created)
      onOpenChange(false)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível criar o tipo.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Novo tipo de serviço</DialogTitle>
          <DialogDescription>
            Crie um tipo para categorizar os atendimentos (ex.: Tatuagem,
            Piercing, Microblading).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="service-type-name">
            Nome <span className="text-destructive">*</span>
          </Label>
          <Input
            id="service-type-name"
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

        <div className="flex items-start justify-between gap-3 rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] p-3">
          <div className="space-y-0.5">
            <Label htmlFor="service-type-age-verification">
              Requer maior de 18 anos
            </Label>
            <p className="text-xs text-foreground/40">
              Bloqueia lançar serviço deste tipo para clientes menores de 18
              anos.
            </p>
          </div>
          <Switch
            id="service-type-age-verification"
            checked={requiresAgeVerification}
            onCheckedChange={setRequiresAgeVerification}
          />
        </div>

        <DialogFooter showCloseButton>
          <Button
            type="button"
            disabled={!name.trim() || saving}
            onClick={() => void handleSubmit()}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar tipo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
