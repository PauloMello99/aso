"use client"

import { Banknote, Landmark, Wallet } from "lucide-react"
import { KpiCard } from "@/shared/components/kpi-card"
import { useMoneyFormatter } from "@/shared/hooks/use-money-formatter"
import type { Balance } from "../types"

interface BalanceCardsProps {
  balance: Balance
  loading?: boolean
}

export function BalanceCards({ balance, loading }: BalanceCardsProps) {
  const money = useMoneyFormatter()
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <KpiCard
        icon={Banknote}
        iconClassName="text-success"
        label="Dinheiro"
        value={money(balance.cashCents)}
        negative={balance.cashCents < 0}
        loading={loading}
      />
      <KpiCard
        icon={Landmark}
        iconClassName="text-info"
        label="Banco / Digital"
        value={money(balance.digitalCents)}
        negative={balance.digitalCents < 0}
        loading={loading}
      />
      <KpiCard
        icon={Wallet}
        iconClassName="text-primary-text"
        label="Total"
        value={money(balance.totalCents)}
        negative={balance.totalCents < 0}
        loading={loading}
        emphasis
      />
    </div>
  )
}
