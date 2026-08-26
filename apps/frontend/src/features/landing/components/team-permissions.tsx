import * as React from "react"
import { UserCheck, SlidersHorizontal, Link2, Building2 } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { GlowCard } from "./glow-card"
import { Reveal } from "./reveal"

const TEAM_ITEMS = [
  {
    icon: UserCheck,
    title: "Cada funcionário vê apenas o que é dele",
    description:
      "Serviços, agenda e caixa próprios. O dono vê tudo e lança em nome de qualquer membro.",
    className: "sm:col-span-2",
  },
  {
    icon: SlidersHorizontal,
    title: "Permissões por módulo",
    description:
      "O dono liga e desliga acesso a Caixa, Estoque, Clientes, Agenda e Serviços, por pessoa.",
  },
  {
    icon: Link2,
    title: "Convite por link",
    description:
      "Membro entra por convite; recusar apaga o convite e permite reenviar.",
  },
  {
    icon: Building2,
    title: "Múltiplas unidades",
    description:
      "Cada organização tem dados isolados; a mesma conta transita entre elas.",
    className: "sm:col-span-2",
  },
]

export function TeamPermissions() {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Cada um vê só o que precisa
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-foreground/50">
            Pensado para quem tem funcionários e não quer expor o faturamento
            do estúdio.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {TEAM_ITEMS.map((item, index) => {
            const Icon = item.icon
            const isPrimary = index === 0
            return (
              <Reveal
                key={item.title}
                delay={index * 60}
                className={cn("h-full", item.className)}
              >
                <GlowCard
                  className={cn(
                    "group h-full rounded-xl border p-6 transition-all",
                    isPrimary
                      ? "border-primary/20 bg-primary-subtle"
                      : "border-foreground/5 bg-foreground/[0.03] hover:border-foreground/10 hover:bg-foreground/[0.05]",
                  )}
                >
                  <div
                    className={cn(
                      "mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg",
                      isPrimary ? "bg-primary/15" : "bg-primary/10",
                    )}
                  >
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-foreground/50">
                    {item.description}
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
