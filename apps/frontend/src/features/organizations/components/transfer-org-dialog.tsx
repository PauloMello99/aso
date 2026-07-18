"use client"

import { useMemo, useState } from "react"
import { ArrowLeftRight } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { Button } from "@/shared/components/ui/button"
import { Label } from "@/shared/components/ui/label"
import type { Member } from "../types"

interface TransferOrgDialogProps {
  members: Member[]
  currentUserEmail: string
  onConfirm: (memberId: string) => Promise<void>
}

export function TransferOrgDialog({
  members,
  currentUserEmail,
  onConfirm,
}: TransferOrgDialogProps) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const eligible = useMemo(
    () =>
      members.filter((m) => m.enabled && m.userEmail !== currentUserEmail),
    [members, currentUserEmail],
  )

  async function handleConfirm() {
    if (!selected) return
    setLoading(true)
    setError(null)
    try {
      await onConfirm(selected)
      setOpen(false)
      setSelected("")
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível transferir a organização.",
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) {
          setSelected("")
          setError(null)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          disabled={eligible.length === 0}
        >
          <ArrowLeftRight className="h-4 w-4" />
          Transferir
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transferir organização</DialogTitle>
          <DialogDescription>
            Escolha o membro que se tornará o novo proprietário. Você passará a
            ter função de <span className="font-medium">funcionário</span> com
            acesso total aos módulos.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <Label htmlFor="transfer-target">Novo proprietário</Label>
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger id="transfer-target">
              <SelectValue placeholder="Selecione um membro" />
            </SelectTrigger>
            <SelectContent>
              {eligible.map((m) => (
                <SelectItem key={m.memberId} value={m.memberId}>
                  {m.userName} ({m.userEmail})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            disabled={!selected || loading}
            onClick={handleConfirm}
            className="w-full sm:w-auto"
          >
            {loading ? "Transferindo…" : "Transferir titularidade"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
