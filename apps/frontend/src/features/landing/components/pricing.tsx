import * as React from "react"
import Link from "next/link"
import { Check, X } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"

interface PlanFeature {
  label: string
  included: boolean
}

interface Plan {
  name: string
  price: string
  period: string
  description: string
  features: PlanFeature[]
  cta: string
  href: string
  highlighted?: boolean
  badge?: string
}

const PLANS: Plan[] = [
  {
    name: "Básico",
    price: "Grátis",
    period: "",
    description: "Para artistas solo começando a se organizar.",
    cta: "Começar grátis",
    href: "/auth/signup",
    features: [
      { label: "Até 30 agendamentos/mês", included: true },
      { label: "1 profissional", included: true },
      { label: "Gestão de clientes", included: true },
      { label: "Notificações por e-mail", included: true },
      { label: "Relatórios avançados", included: false },
      { label: "Múltiplos profissionais", included: false },
      { label: "Integrações (Stripe, Pix)", included: false },
      { label: "Suporte prioritário", included: false },
    ],
  },
  {
    name: "Pro",
    price: "R$ 79",
    period: "/mês",
    description: "Para estúdios em crescimento com equipe e clientes fiéis.",
    cta: "Assinar Pro",
    href: "/auth/signup",
    highlighted: true,
    badge: "Mais popular",
    features: [
      { label: "Agendamentos ilimitados", included: true },
      { label: "Até 5 profissionais", included: true },
      { label: "Gestão de clientes", included: true },
      { label: "Notificações WhatsApp + e-mail", included: true },
      { label: "Relatórios avançados", included: true },
      { label: "Múltiplos profissionais", included: true },
      { label: "Integrações (Stripe, Pix)", included: true },
      { label: "Suporte prioritário", included: false },
    ],
  },
  {
    name: "Enterprise",
    price: "Sob consulta",
    period: "",
    description: "Para redes de estúdios com necessidades específicas.",
    cta: "Falar com vendas",
    href: "mailto:contato@assessorink-so.com",
    features: [
      { label: "Agendamentos ilimitados", included: true },
      { label: "Profissionais ilimitados", included: true },
      { label: "Gestão de clientes", included: true },
      { label: "Notificações WhatsApp + e-mail", included: true },
      { label: "Relatórios avançados", included: true },
      { label: "Múltiplos estúdios", included: true },
      { label: "Integrações personalizadas", included: true },
      { label: "Suporte prioritário 24/7", included: true },
    ],
  },
]

export function Pricing() {
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

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "relative flex flex-col rounded-2xl border p-8 transition-all",
                plan.highlighted
                  ? "border-primary/50 bg-primary/5"
                  : "border-foreground/5 bg-foreground/[0.03]",
              )}
            >
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    {plan.badge}
                  </Badge>
                </div>
              )}

              <div className="mb-6">
                <p className="text-sm font-medium text-foreground/60">{plan.name}</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-foreground sm:text-4xl">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-foreground/40">{plan.period}</span>
                  )}
                </div>
                <p className="mt-3 text-sm text-foreground/50">{plan.description}</p>
              </div>

              <ul className="mb-8 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature.label} className="flex items-center gap-3">
                    {feature.included ? (
                      <Check className="h-4 w-4 shrink-0 text-primary-text" />
                    ) : (
                      <X className="h-4 w-4 shrink-0 text-foreground/20" />
                    )}
                    <span
                      className={cn(
                        "text-sm",
                        feature.included ? "text-foreground/70" : "text-foreground/30",
                      )}
                    >
                      {feature.label}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                className={cn(
                  "w-full",
                  plan.highlighted
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border border-foreground/10 bg-transparent text-foreground hover:bg-foreground/5",
                )}
              >
                <Link href={plan.href}>{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
