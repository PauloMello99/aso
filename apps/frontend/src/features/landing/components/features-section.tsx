import * as React from "react"
import {
  CalendarDays,
  Users,
  DollarSign,
  BarChart3,
  Bell,
  ShieldCheck,
} from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"

const FEATURES = [
  {
    icon: CalendarDays,
    title: "Agendamentos inteligentes",
    description:
      "Calendário visual com bloqueio automático, lembretes por WhatsApp e confirmações digitais.",
  },
  {
    icon: Users,
    title: "Gestão de clientes",
    description:
      "Histórico completo por cliente — sessões, fotos, notas e ficha de anamnese.",
  },
  {
    icon: DollarSign,
    title: "Financeiro simplificado",
    description:
      "Controle de receitas, despesas, comissões e relatórios por período em um clique.",
  },
  {
    icon: BarChart3,
    title: "Relatórios e métricas",
    description:
      "Dashboards com taxa de ocupação, ticket médio e performance por profissional.",
  },
  {
    icon: Bell,
    title: "Notificações automáticas",
    description:
      "Lembretes de consulta, confirmações de pagamento e follow-ups pós-sessão.",
  },
  {
    icon: ShieldCheck,
    title: "Multi-estúdio seguro",
    description:
      "Gerencie múltiplas unidades com permissões por perfil — dono, gerente ou artista.",
  },
]

export function FeaturesSection() {
  return (
    <section id="recursos" className="py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-16 text-center">
          <div className="mb-4 flex justify-center">
            <Badge
              variant="outline"
              className="border-white/10 text-white/60"
            >
              Recursos
            </Badge>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            Tudo que você precisa
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-white/50">
            Projetado para o dia a dia de artistas independentes e estúdios em
            crescimento.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="group rounded-xl border border-white/5 bg-white/[0.03] p-6 transition-all hover:border-white/10 hover:bg-white/[0.05]"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                  <Icon className="h-5 w-5 text-orange-400" />
                </div>
                <h3 className="mb-2 text-base font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-white/50">
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
