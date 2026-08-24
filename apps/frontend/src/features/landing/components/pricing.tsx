import * as React from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { formatBRL } from "@/features/cashier/lib/money";
import type {
  BillingInterval,
  PublicBillingPlan,
} from "@/features/billing/types";

const INTERVAL_LABELS: Record<BillingInterval, string> = {
  monthly: "/mês",
  semiannual: "/semestre",
  annual: "/ano",
};

const INTERVAL_TOGGLE_LABELS: Record<BillingInterval, string> = {
  monthly: "Mensal",
  semiannual: "Semestral",
  annual: "Anual",
};

const INTERVAL_ORDER: BillingInterval[] = ["monthly", "semiannual", "annual"];

interface PricingProps {
  plans: PublicBillingPlan[];
}

export function Pricing({ plans }: PricingProps) {
  const availableIntervals = INTERVAL_ORDER.filter((interval) =>
    plans.some((plan) =>
      plan.prices.some((price) => price.interval === interval),
    ),
  );

  const [selectedInterval, setSelectedInterval] =
    React.useState<BillingInterval>("monthly");

  return (
    <section id="precos" className="py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-10 text-center sm:mb-16">
          <div className="mb-4 flex justify-center">
            <Badge
              variant="outline"
              className="border-foreground/10 font-semibold text-foreground/60"
            >
              Preços
            </Badge>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Simples e transparente
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-foreground/50">
            Sem taxas escondidas. Cancele quando quiser.
          </p>
        </div>

        {plans.length === 0 ? (
          <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-foreground/5 bg-foreground/[0.03] p-8 text-center">
            <p className="text-foreground/70">
              Nossos planos estão sendo atualizados. Fale com a gente para saber
              os valores atuais.
            </p>
            <Button asChild className="mt-6 w-full sm:w-auto">
              <Link href="mailto:contato@assessorink-so.com">Fale conosco</Link>
            </Button>
          </div>
        ) : (
          <>
            {availableIntervals.length > 1 && (
              <div className="mb-8 flex justify-center">
                <div className="inline-flex flex-wrap items-center gap-1 rounded-full border border-foreground/10 bg-foreground/[0.03] p-1">
                  {availableIntervals.map((interval) => (
                    <button
                      key={interval}
                      type="button"
                      onClick={() => setSelectedInterval(interval)}
                      className={cn(
                        "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                        selectedInterval === interval
                          ? "bg-foreground text-background"
                          : "text-foreground/50 hover:text-foreground/80",
                      )}
                    >
                      {INTERVAL_TOGGLE_LABELS[interval]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div
              className={cn(
                "grid grid-cols-1 gap-6",
                plans.length === 1 && "max-w-md mx-auto",
                plans.length === 2 && "md:grid-cols-2",
                plans.length >= 3 && "md:grid-cols-3",
              )}
            >
              {plans.map((plan) => {
                const price =
                  plan.prices.find((p) => p.interval === selectedInterval) ??
                  plan.prices.find((p) => p.interval === "monthly") ??
                  plan.prices[0];

                const monthly = plan.prices.find(
                  (p) => p.interval === "monthly",
                );

                let savingsPct = 0;
                if (price && monthly && price.interval !== "monthly") {
                  const divisor = price.interval === "annual" ? 12 : 6;
                  const mensalEquivalente = price.amountCents / divisor;
                  savingsPct = Math.round(
                    (1 - mensalEquivalente / monthly.amountCents) * 100,
                  );
                }

                const features = plan.features ?? [];
                const isHighlighted = plan.highlighted === true;

                return (
                  <div
                    key={plan.key}
                    className={cn(
                      "relative flex flex-col rounded-2xl border border-foreground/5 bg-foreground/[0.03] p-8 transition-all",
                      isHighlighted &&
                        "border-primary/40 ring-1 ring-primary/20",
                    )}
                  >
                    {isHighlighted && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                        Recomendado
                      </Badge>
                    )}

                    <div className="mb-6">
                      <p className="text-sm font-medium text-foreground/60">
                        {plan.name}
                      </p>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-foreground sm:text-4xl">
                          {price ? formatBRL(price.amountCents) : "Sob consulta"}
                        </span>
                        {price && (
                          <span className="text-foreground/40">
                            {INTERVAL_LABELS[price.interval]}
                          </span>
                        )}
                      </div>
                      {savingsPct > 0 && (
                        <p className="mt-1 text-xs text-success">
                          Economize {savingsPct}%
                        </p>
                      )}
                      {plan.description && (
                        <p className="mt-3 text-sm text-foreground/50">
                          {plan.description}
                        </p>
                      )}
                    </div>

                    {features.length > 0 && (
                      <ul className="mb-6 space-y-2">
                        {features.map((feature, index) => (
                          <li
                            key={`${feature}-${index}`}
                            className="flex items-start gap-2 text-sm text-foreground/60"
                          >
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="flex-1" />

                    <Button
                      asChild
                      className="w-full border border-foreground/10 bg-transparent text-foreground hover:bg-foreground/5"
                    >
                      <Link href="/auth/signup">Começar agora</Link>
                    </Button>

                    {price && (
                      <p className="mt-3 text-center text-xs text-foreground/40">
                        60 dias grátis · depois {formatBRL(price.amountCents)}
                        {INTERVAL_LABELS[price.interval]}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
