"use client"

import { Banknote, Landmark, Wallet } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { formatBRL } from "../lib/money"
import type { Balance } from "../types"

interface BalanceCardsProps {
  balance: Balance
  loading?: boolean
}

export function BalanceCards({ balance, loading }: BalanceCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <BalanceCard
        icon={<Banknote className="h-4 w-4 text-success" />}
        label="Dinheiro"
        cents={balance.cashCents}
        loading={loading}
      />
      <BalanceCard
        icon={<Landmark className="h-4 w-4 text-info" />}
        label="Banco / Digital"
        cents={balance.digitalCents}
        loading={loading}
      />
      <BalanceCard
        icon={<Wallet className="h-4 w-4 text-primary" />}
        label="Total"
        cents={balance.totalCents}
        loading={loading}
        emphasis
      />
    </div>
  )
}

function BalanceCard({
  icon,
  label,
  cents,
  loading,
  emphasis,
}: {
  icon: React.ReactNode
  label: string
  cents: number
  loading?: boolean
  emphasis?: boolean
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        emphasis
          ? "border-primary/20 bg-primary/[0.04]"
          : "border-foreground/[0.06] bg-foreground/[0.02]",
      )}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs text-foreground/40">{label}</span>
      </div>
      {loading ? (
        <div className="mt-2 h-8 w-28 animate-pulse rounded bg-foreground/[0.06]" />
      ) : (
        <p
          className={cn(
            "mt-2 text-2xl font-semibold tabular-nums",
            cents < 0 ? "text-destructive" : "text-foreground",
          )}
        >
          {formatBRL(cents)}
        </p>
      )}
    </div>
  )
}
