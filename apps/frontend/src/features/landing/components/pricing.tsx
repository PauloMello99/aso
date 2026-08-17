import * as React from "react"
import Link from "next/link"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"
import { formatBRL } from "@/features/cashier/lib/money"
import type { BillingInterval, PublicBillingPlan } from "@/features/billing/types"

const INTERVAL_LABELS: Record<BillingInterval, string> = {
  monthly: "/mês",
  semiannual: "/semestre",
  annual: "/ano",
}

interface PricingProps {
  plans: PublicBillingPlan[]
}

export function Pricing({ plans }: PricingProps) {
  return (
    <section id="precos" className="py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-10 text-center sm:mb-16">
          <div className="mb-4 flex justify-center">
            <Badge
              variant="outline"
              className="border-foreground/10 text-foreground/60"
            >
              Preços
            </Badge>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Simples e transparente
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-foreground/50">
            Sem taxas escondidas. Cancele quando quiser.
          </p>
        </div>

        {plans.length === 0 ? (
          <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-foreground/5 bg-foreground/[0.03] p-8 text-center">
            <p className="text-foreground/70">
              Nossos planos estão sendo atualizados. Fale com a gente para saber os
              valores atuais.
            </p>
            <Button asChild className="mt-6 w-full sm:w-auto">
              <Link href="mailto:contato@assessorink-so.com">Fale conosco</Link>
            </Button>
          </div>
        ) : (
          <div
            className={cn(
              "grid grid-cols-1 gap-6",
              plans.length === 2 && "md:grid-cols-2",
              plans.length >= 3 && "md:grid-cols-3",
            )}
          >
            {plans.map((plan) => {
              const primaryPrice =
                plan.prices.find((price) => price.interval === "monthly") ??
                plan.prices[0]
              const otherPrices = plan.prices.filter(
                (price) => price !== primaryPrice,
              )

              return (
                <div
                  key={plan.key}
                  className="relative flex flex-col rounded-2xl border border-foreground/5 bg-foreground/[0.03] p-8 transition-all"
                >
                  <div className="mb-6">
                    <p className="text-sm font-medium text-foreground/60">
                      {plan.name}
                    </p>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-foreground sm:text-4xl">
                        {primaryPrice
                          ? formatBRL(primaryPrice.amountCents)
                          : "Sob consulta"}
                      </span>
                      {primaryPrice && (
                        <span className="text-foreground/40">
                          {INTERVAL_LABELS[primaryPrice.interval]}
                        </span>
                      )}
                    </div>
                    {otherPrices.length > 0 && (
                      <p className="mt-1 text-xs text-foreground/40">
                        {otherPrices
                          .map(
                            (price) =>
                              `ou ${formatBRL(price.amountCents)}${INTERVAL_LABELS[price.interval]}`,
                          )
                          .join(" · ")}
                      </p>
                    )}
                    {plan.description && (
                      <p className="mt-3 text-sm text-foreground/50">
                        {plan.description}
                      </p>
                    )}
                  </div>

                  <div className="flex-1" />

                  <Button
                    asChild
                    className="w-full border border-foreground/10 bg-transparent text-foreground hover:bg-foreground/5"
                  >
                    <Link href="/auth/signup">Começar agora</Link>
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
