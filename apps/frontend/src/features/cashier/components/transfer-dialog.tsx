"use client"

import { useState } from "react"
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
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { parseReaisToCents } from "../lib/money"
import { TRANSFER_METHOD_LABELS, type TransferMethod } from "../types"
import type { TransferBody } from "../hooks/use-transactions"

const METHODS: TransferMethod[] = ["cash", "bank_transfer"]

interface TransferDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (body: TransferBody) => Promise<void>
}

export function TransferDialog({ open, onOpenChange, onSubmit }: TransferDialogProps) {
  const [from, setFrom] = useState<TransferMethod>("cash")
  const [to, setTo] = useState<TransferMethod>("bank_transfer")
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setError(null)
    const cents = parseReaisToCents(amount)
    if (Number.isNaN(cents) || cents <= 0) {
      setError("Informe um valor válido.")
      return
    }
    if (from === to) {
      setError("Escolha métodos diferentes.")
      return
    }
    setLoading(true)
    try {
      await onSubmit({ fromMethod: from, toMethod: to, amountCents: cents })
      setAmount("")
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na transferência.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onOpenChange(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transferência entre caixas</DialogTitle>
          <DialogDescription>
            Move um valor de um meio para outro (ex.: dinheiro → banco). Gera uma
            saída e uma entrada equivalentes.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>De</Label>
            <Select value={from} onValueChange={(v) => setFrom(v as TransferMethod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {TRANSFER_METHOD_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Para</Label>
            <Select value={to} onValueChange={(v) => setTo(v as TransferMethod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {TRANSFER_METHOD_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Valor</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground/40">
                R$
              </span>
              <Input
                placeholder="0,00"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button disabled={loading} onClick={handleConfirm} className="w-full sm:w-auto">
            {loading ? "Transferindo…" : "Transferir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
