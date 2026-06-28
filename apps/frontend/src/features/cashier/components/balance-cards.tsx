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
        icon={<Banknote className="h-4 w-4 text-emerald-400" />}
        label="Dinheiro"
        cents={balance.cashCents}
        loading={loading}
      />
      <BalanceCard
        icon={<Landmark className="h-4 w-4 text-sky-400" />}
        label="Banco / Digital"
        cents={balance.digitalCents}
        loading={loading}
      />
      <BalanceCard
        icon={<Wallet className="h-4 w-4 text-orange-400" />}
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
          ? "border-orange-500/20 bg-orange-500/[0.04]"
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
            cents < 0 ? "text-red-400" : "text-foreground",
          )}
        >
          {formatBRL(cents)}
        </p>
      )}
    </div>
  )
}
