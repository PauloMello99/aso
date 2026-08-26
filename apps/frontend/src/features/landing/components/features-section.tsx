import * as React from "react"
import {
  CalendarDays,
  FileSignature,
  Wallet,
  Boxes,
  Users,
  TrendingUp,
} from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { GlowCard } from "./glow-card"
import { Reveal } from "./reveal"

const FEATURES = [
  {
    icon: Wallet,
    title: "Caixa que não mente",
    description:
      "Lançamentos imutáveis com correção por errata: nada é apagado. A taxa do cartão já entra descontada, então o saldo mostrado é o líquido de verdade.",
    featured: true,
  },
  {
    icon: CalendarDays,
    title: "Agenda por profissional",
    description:
      "Cada tatuador vê a própria agenda; o dono vê tudo e agenda em nome de qualquer um.",
  },
  {
    icon: FileSignature,
    title: "Anamnese digital assinada",
    description:
      "Formulário por tipo de serviço, versionado. O cliente responde por link e assina.",
  },
  {
    icon: Boxes,
    title: "Estoque real",
    description:
      "Baixa automática por serviço, alerta de mínimo e quanto custa repor tudo.",
  },
  {
    icon: Users,
    title: "Clientes com histórico",
    description:
      "Sessões, origem, anexos e fichas de anamnese num só lugar.",
  },
  {
    icon: TrendingUp,
    title: "Números do estúdio",
    description:
      "Receita, despesa, ticket médio e margem por serviço. Exporta em CSV.",
    featured: true,
  },
]

export function FeaturesSection() {
  return (
    <section id="recursos" className="py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Tudo que você precisa
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-foreground/50">
            Projetado para o dia a dia de tatuadores e estúdios de tatuagem em
            crescimento.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Reveal
                key={feature.title}
                delay={index * 60}
                className={cn("h-full", feature.featured && "lg:col-span-2")}
              >
                <GlowCard
                  className={cn(
                    "group flex h-full flex-col rounded-xl border p-6 transition-all",
                    feature.featured
                      ? "border-primary/20 bg-primary-subtle"
                      : "border-foreground/5 bg-foreground/[0.03] hover:border-foreground/10 hover:bg-foreground/[0.05]",
                  )}
                >
                  <div
                    className={cn(
                      "mb-4 inline-flex items-center justify-center rounded-lg",
                      feature.featured
                        ? "h-12 w-12 bg-primary/15"
                        : "h-10 w-10 bg-primary/10",
                    )}
                  >
                    <Icon
                      className={cn(
                        "text-primary",
                        feature.featured ? "h-6 w-6" : "h-5 w-5",
                      )}
                    />
                  </div>
                  <h3
                    className={cn(
                      "mb-2 font-semibold text-foreground",
                      feature.featured ? "text-xl" : "text-base",
                    )}
                  >
                    {feature.title}
                  </h3>
                  <p
                    className={cn(
                      "leading-relaxed text-foreground/50",
                      feature.featured ? "text-base" : "text-sm",
                    )}
                  >
                    {feature.description}
                  </p>
                </GlowCard>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
