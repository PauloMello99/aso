"use client"

import { CreditCard, TrendingUp, Receipt } from "lucide-react"
import Link from "next/link"

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

      <p className="rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] p-4 text-sm text-foreground/50">
        Para gerenciar a assinatura de uma organização específica (isenção,
        desconto, faturas), acesse{" "}
        <Link href="/admin/orgs" className="text-primary hover:underline">
          Organizações
        </Link>{" "}
        → selecione a organização → aba <strong>Assinatura</strong>.
      </p>
    </div>
  )
}
