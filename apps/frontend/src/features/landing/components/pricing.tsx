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
    href: "mailto:contato@inkops.com.br",
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
        {/* Header */}
        <div className="mb-10 text-center sm:mb-16">
          <div className="mb-4 flex justify-center">
            <Badge
              variant="outline"
              className="border-white/10 text-white/60"
            >
              Preços
            </Badge>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            Simples e transparente
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-white/50">
            Sem taxas escondidas. Cancele quando quiser.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "relative flex flex-col rounded-2xl border p-8 transition-all",
                plan.highlighted
                  ? "border-orange-500/50 bg-orange-500/5"
                  : "border-white/5 bg-white/[0.03]",
              )}
            >
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <Badge className="bg-orange-500 text-white">
                    {plan.badge}
                  </Badge>
                </div>
              )}

              <div className="mb-6">
                <p className="text-sm font-medium text-white/60">{plan.name}</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white sm:text-4xl">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-white/40">{plan.period}</span>
                  )}
                </div>
                <p className="mt-3 text-sm text-white/50">{plan.description}</p>
              </div>

              <ul className="mb-8 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature.label} className="flex items-center gap-3">
                    {feature.included ? (
                      <Check className="h-4 w-4 shrink-0 text-green-400" />
                    ) : (
                      <X className="h-4 w-4 shrink-0 text-white/20" />
                    )}
                    <span
                      className={cn(
                        "text-sm",
                        feature.included ? "text-white/70" : "text-white/30",
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
                    ? "bg-orange-500 text-white hover:bg-orange-600"
                    : "border border-white/10 bg-transparent text-white hover:bg-white/5",
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
