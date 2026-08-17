import * as React from "react"
import { X, Check } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"

const BEFORE_ITEMS = [
  "Agenda no WhatsApp, confirmação que ninguém lembra de pedir",
  "Ficha de anamnese em papel, guardada numa gaveta",
  "Caixa no caderno, taxa da maquininha descoberta no fim do mês",
  "Material que acaba no meio da sessão",
  '"Quanto sobrou desse trabalho?"',
]

const AFTER_ITEMS = [
  "Agenda por profissional, com lembrete automático por e-mail",
  "Ficha digital assinada, versionada, com PDF e consentimento registrado",
  "Lançamento já entra líquido, com a taxa do cartão descontada",
  "Estoque que baixa sozinho a cada serviço, com alerta de mínimo",
  "Custo do material vs. receita, com margem por serviço",
]

export function ProblemShift() {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-16 text-center">
          <div className="mb-4 flex justify-center">
            <Badge
              variant="outline"
              className="border-foreground/10 font-semibold text-foreground/60"
            >
              O problema
            </Badge>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Sua rotina, antes e depois
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div>
            <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-foreground/40">
              Hoje
            </h3>
            <ul className="space-y-4">
              {BEFORE_ITEMS.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground/5 text-foreground/40">
                    <X className="h-3 w-3" />
                  </span>
                  <span className="text-foreground/60">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-primary/70">
              Com o ASO
            </h3>
            <ul className="space-y-4">
              {AFTER_ITEMS.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Check className="h-3 w-3" />
                  </span>
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
