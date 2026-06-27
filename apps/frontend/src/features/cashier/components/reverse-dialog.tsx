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
import { Button } from "@/shared/components/ui/button"
import { formatBRL } from "../lib/money"
import {
  PAYMENT_METHOD_LABELS,
  TRANSACTION_TYPE_LABELS,
  type Transaction,
} from "../types"

interface ReverseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: Transaction | null
  onConfirm: () => Promise<void>
}

export function ReverseDialog({
  open,
  onOpenChange,
  transaction,
  onConfirm,
}: ReverseDialogProps) {
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onOpenChange(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Estornar lançamento</DialogTitle>
          <DialogDescription>
            Será criado um lançamento de estorno que anula este. A transação
            original permanece no histórico, marcada como estornada.
          </DialogDescription>
        </DialogHeader>

        {transaction && (
          <div className="rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] p-3 text-sm">
            <p className="truncate text-foreground/70">{transaction.description}</p>
            <p className="mt-0.5 tabular-nums text-foreground/40">
              {TRANSACTION_TYPE_LABELS[transaction.type]} ·{" "}
              {formatBRL(transaction.netCents)} ·{" "}
              {PAYMENT_METHOD_LABELS[transaction.paymentMethod]}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="destructive"
            disabled={loading}
            onClick={handleConfirm}
            className="w-full sm:w-auto"
          >
            {loading ? "Estornando…" : "Confirmar estorno"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
