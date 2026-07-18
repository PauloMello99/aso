"use client"

import { CreditCard, Lock, TrendingUp, Receipt } from "lucide-react"

export function AdminBilling() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Assinaturas &amp; Financeiro
        </h1>
        <p className="mt-0.5 text-sm text-foreground/40">
          Receita, planos e cobrança das organizações da plataforma.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "MRR", icon: TrendingUp },
          { label: "Assinaturas ativas", icon: CreditCard },
          { label: "Em trial", icon: Receipt },
          { label: "Inadimplentes", icon: Receipt },
        ].map(({ label, icon: Icon }) => (
          <div
            key={label}
            className="rounded-xl border border-dashed border-foreground/[0.08] bg-foreground/[0.01] p-4 opacity-60"
          >
            <div className="flex items-center gap-1.5 text-xs text-foreground/40">
              <Icon className="h-3.5 w-3.5" />
              {label}
            </div>
            <p className="mt-1.5 text-2xl font-semibold text-foreground/20">—</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-3 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] px-6 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/10">
          <Lock className="h-5 w-5 text-orange-400" />
        </div>
        <h2 className="text-base font-semibold text-foreground">
          Disponível com o billing (PLAT-2)
        </h2>
        <p className="max-w-md text-sm text-foreground/50">
          A gestão de assinaturas e a visão financeira da plataforma dependem da
          integração de cobrança (Stripe), planejada na tarefa{" "}
          <span className="font-medium text-foreground/70">PLAT-2</span>. Assim que
          os planos e pagamentos existirem, esta seção mostrará MRR, status de
          assinatura por organização, trials e inadimplência.
        </p>
      </div>
    </div>
  )
}
