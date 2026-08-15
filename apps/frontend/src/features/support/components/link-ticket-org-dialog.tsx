"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { useAdminOrgs } from "@/features/admin/hooks/use-admin"

interface LinkTicketOrgDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loading: boolean
  error: string | null
  onConfirm: (orgId: string) => void
}

export function LinkTicketOrgDialog({
  open,
  onOpenChange,
  loading,
  error,
  onConfirm,
}: LinkTicketOrgDialogProps) {
  const { orgs, loading: orgsLoading } = useAdminOrgs()
  const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>()

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (loading) return
        onOpenChange(v)
        if (!v) setSelectedOrgId(undefined)
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Vincular a uma organização</DialogTitle>
          <DialogDescription>
            Esta ação é{" "}
            <span className="font-semibold text-destructive">irreversível</span>.
            Ao vincular, o chamado passará a ficar visível a todos os membros da
            organização selecionada.
          </DialogDescription>
        </DialogHeader>

        <Select
          value={selectedOrgId}
          onValueChange={setSelectedOrgId}
          disabled={orgsLoading || loading}
        >
          <SelectTrigger className="h-9 w-full text-sm">
            <SelectValue placeholder="Selecione uma organização" />
          </SelectTrigger>
          <SelectContent>
            {orgs.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {error && (
          <p
            role="alert"
            className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            disabled={!selectedOrgId || loading}
            onClick={() => selectedOrgId && onConfirm(selectedOrgId)}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Vincular
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
