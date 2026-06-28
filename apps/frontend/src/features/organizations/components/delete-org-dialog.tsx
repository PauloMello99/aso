"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import type { OrgSummary } from "@/features/dashboard/hooks/use-orgs"

interface DeleteOrgDialogProps {
  org: OrgSummary
  onConfirm: () => Promise<void>
}

export function DeleteOrgDialog({ org, onConfirm }: DeleteOrgDialogProps) {
  const [open, setOpen] = useState(false)
  const [confirmation, setConfirmation] = useState("")
  const [loading, setLoading] = useState(false)

  const isConfirmed = confirmation === org.name

  async function handleDelete() {
    if (!isConfirmed) return
    setLoading(true)
    try {
      await onConfirm()
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) setConfirmation("")
      }}
    >
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" className="w-full sm:w-auto">
          <Trash2 className="h-4 w-4" />
          Excluir organização
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir organização</DialogTitle>
          <DialogDescription>
            Esta ação é <span className="font-semibold text-red-400">irreversível</span>.
            Todos os dados da organização serão permanentemente excluídos.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <Label htmlFor="delete-confirm">
            Digite{" "}
            <span className="font-mono text-foreground/80">{org.name}</span> para
            confirmar:
          </Label>
          <Input
            id="delete-confirm"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder={org.name}
            autoComplete="off"
          />
        </div>

        <DialogFooter>
          <Button
            variant="destructive"
            disabled={!isConfirmed || loading}
            onClick={handleDelete}
            className="w-full sm:w-auto"
          >
            {loading ? "Excluindo…" : "Excluir permanentemente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
