import * as React from "react"
import { Check } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"

const STATS = [
  { value: "500+", label: "Estúdios ativos" },
  { value: "98%", label: "Satisfação" },
  { value: "12k+", label: "Agendamentos/mês" },
  { value: "R$2M+", label: "Processados" },
]

const BULLETS = [
  "Interface projetada para o contexto de artistas independentes",
  "Sem contratos de longo prazo — cancele quando quiser",
  "Suporte via WhatsApp em português",
  "Atualizações contínuas baseadas no feedback dos usuários",
  "Dados seguros com criptografia e backups automáticos",
]

export function About() {
  return (
    <section id="sobre" className="py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Left: text */}
          <div>
            <div className="mb-4">
              <Badge
                variant="outline"
                className="border-white/10 text-white/60"
              >
                Sobre o ink-ops
              </Badge>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
              Feito por quem
              <br />
              <span className="text-orange-500">entende o ofício</span>
            </h2>
            <p className="mt-6 leading-relaxed text-white/50">
              Construído com e para artistas. Sabemos que sua energia deve ir para
              o trabalho criativo, não para planilhas e anotações perdidas.
              O ink-ops cuida da gestão para você focar no que realmente importa.
            </p>

            <ul className="mt-8 space-y-3">
              {BULLETS.map((bullet) => (
                <li key={bullet} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-500/15">
                    <Check className="h-3 w-3 text-orange-400" />
                  </span>
                  <span className="text-sm text-white/60">{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: stats */}
          <div className="grid grid-cols-2 gap-4">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-white/5 bg-white/[0.03] p-4 sm:p-6"
              >
                <p className="text-2xl font-bold text-orange-400 sm:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-white/50">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
