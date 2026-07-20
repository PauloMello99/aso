"use client"

import { Banknote, Landmark, Wallet } from "lucide-react"
import { KpiCard } from "@/shared/components/kpi-card"
import { formatBRL } from "../lib/money"
import type { Balance } from "../types"

interface BalanceCardsProps {
  balance: Balance
  loading?: boolean
}

export function BalanceCards({ balance, loading }: BalanceCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <KpiCard
        icon={Banknote}
        iconClassName="text-success"
        label="Dinheiro"
        value={formatBRL(balance.cashCents)}
        negative={balance.cashCents < 0}
        loading={loading}
      />
      <KpiCard
        icon={Landmark}
        iconClassName="text-info"
        label="Banco / Digital"
        value={formatBRL(balance.digitalCents)}
        negative={balance.digitalCents < 0}
        loading={loading}
      />
      <KpiCard
        icon={Wallet}
        iconClassName="text-primary-text"
        label="Total"
        value={formatBRL(balance.totalCents)}
        negative={balance.totalCents < 0}
        loading={loading}
        emphasis
      />
    </div>
  )
}
