import * as React from "react"
import {
  CalendarDays,
  FileSignature,
  Wallet,
  Boxes,
  Users,
  TrendingUp,
} from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { Reveal } from "./reveal"

const FEATURES = [
  {
    icon: CalendarDays,
    title: "Agenda por profissional",
    description:
      "Cada tatuador vê a própria agenda; o dono vê tudo e agenda em nome de qualquer um. Lembrete automático antes da sessão.",
  },
  {
    icon: FileSignature,
    title: "Anamnese digital assinada",
    description:
      "Formulário por tipo de serviço, versionado. O cliente responde por link, assina e o PDF fica anexado à sessão.",
  },
  {
    icon: Wallet,
    title: "Caixa que não mente",
    description:
      "Lançamentos imutáveis com correção por errata — nada é apagado. A taxa do cartão já entra descontada.",
  },
  {
    icon: Boxes,
    title: "Estoque real",
    description:
      "Descartável ou compartilhado, baixa automática por serviço, alerta de mínimo e quanto custa repor tudo.",
  },
  {
    icon: Users,
    title: "Clientes com histórico",
    description:
      "Sessões, origem, anexos, observações e todas as fichas de anamnese num só lugar.",
  },
  {
    icon: TrendingUp,
    title: "Números do estúdio",
    description:
      "Receita, despesa, ticket médio, novos clientes e margem por serviço. Exporta em CSV escolhendo as colunas.",
  },
]

export function FeaturesSection() {
  return (
    <section id="recursos" className="py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-16 text-center">
          <div className="mb-4 flex justify-center">
            <Badge
              variant="outline"
              className="border-foreground/10 font-semibold text-foreground/60"
            >
              Recursos
            </Badge>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Tudo que você precisa
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-foreground/50">
            Projetado para o dia a dia de tatuadores e estúdios de tatuagem em
            crescimento.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Reveal key={feature.title} delay={index * 60} className="h-full">
                <div className="group h-full rounded-xl border border-foreground/5 bg-foreground/[0.03] p-6 transition-all hover:border-foreground/10 hover:bg-foreground/[0.05]">
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-foreground/50">
                    {feature.description}
                  </p>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
