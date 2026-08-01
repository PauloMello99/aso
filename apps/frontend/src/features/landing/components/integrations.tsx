import * as React from "react"
import {
  CreditCard,
  MessageCircle,
  Calendar,
  Mail,
  Camera,
  Banknote,
  FileText,
  Zap,
} from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { Separator } from "@/shared/components/ui/separator"

const INTEGRATIONS = [
  { icon: CreditCard, name: "Stripe", description: "Pagamentos online" },
  { icon: MessageCircle, name: "WhatsApp", description: "Mensagens automáticas" },
  { icon: Calendar, name: "Google Calendar", description: "Sincronização de agenda" },
  { icon: Mail, name: "E-mail", description: "Notificações e marketing" },
  { icon: Camera, name: "Instagram", description: "Portfólio integrado" },
  { icon: Banknote, name: "Pix", description: "Pagamento instantâneo" },
  { icon: FileText, name: "Notion", description: "Documentação e notas" },
  { icon: Zap, name: "Zapier", description: "Automações sem código" },
]

export function Integrations() {
  return (
    <section id="integracoes" className="bg-foreground/[0.02]">
      <Separator className="bg-foreground/5" />

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
        <div className="mb-10 text-center sm:mb-16">
          <div className="mb-4 flex justify-center">
            <Badge
              variant="outline"
              className="border-foreground/10 text-foreground/60"
            >
              Integrações
            </Badge>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Conecte suas ferramentas
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-foreground/50">
            Integre com as plataformas que você já usa sem precisar trocar de
            ecossistema.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {INTEGRATIONS.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.name}
                className="flex flex-col items-center gap-3 rounded-xl border border-foreground/5 bg-foreground/[0.03] p-6 text-center transition-all hover:border-foreground/10"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-foreground/5">
                  <Icon className="h-6 w-6 text-foreground/60" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{item.name}</p>
                  <p className="mt-0.5 text-xs text-foreground/40">
                    {item.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <Separator className="bg-foreground/5" />
    </section>
  )
}
