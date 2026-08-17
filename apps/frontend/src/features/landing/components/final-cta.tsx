import * as React from "react"
import Link from "next/link"
import { Button } from "@/shared/components/ui/button"

export function FinalCta() {
  return (
    <section className="bg-primary-subtle py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Comece hoje. Leve 60 dias para decidir.
        </h2>

        <div className="mt-8 flex justify-center">
          <Button
            size="lg"
            asChild
            className="w-full bg-primary px-8 text-primary-foreground hover:bg-primary/90 sm:w-auto"
          >
            <Link href="/auth/signup">Testar 60 dias grátis</Link>
          </Button>
        </div>

        <p className="mt-3 text-xs text-foreground/50">
          Cartão necessário · cancele quando quiser
        </p>

        <p className="mt-6 text-sm text-foreground/60">
          Precisa de ajuda para migrar seus dados ou só quer tirar uma dúvida
          antes?{" "}
          <Link href="/suporte" className="text-primary hover:underline">
            Fale com a gente
          </Link>
        </p>
      </div>
    </section>
  )
}
