import { Inbox } from "lucide-react"

export function QuoteUnavailableState() {
  return (
    <div className="rounded-xl border border-dashed border-foreground/[0.08] px-4 py-16 text-center">
      <Inbox className="mx-auto h-8 w-8 text-foreground/20" aria-hidden="true" />
      <p className="mt-3 text-sm font-medium text-foreground/60">
        Caixa de orçamentos indisponível
      </p>
      <p className="mt-1 text-sm text-foreground/40">
        Este recurso ainda não foi liberado para o seu estúdio.
      </p>
    </div>
  )
}
