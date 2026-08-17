import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/shared/components/ui/button"
import { BackgroundGrid } from "./background-grid"

export function Hero() {
  return (
    <section className="relative overflow-hidden py-20 md:py-40">
      <BackgroundGrid variant="dots" glows={true} />

      <div className="relative z-10 mx-auto max-w-7xl px-4 text-center sm:px-6">
        <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl md:text-7xl">
          Gestão completa para
          <br />
          <span className="text-primary">estúdios de tatuagem</span>
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-foreground/60 sm:mt-6 sm:text-lg">
          Agendamentos, clientes, anamnese e caixa em um único lugar.
          Construído para tatuadores e estúdios de tatuagem — não para
          qualquer negócio criativo.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:mt-10 sm:flex-row sm:gap-4">
          <Button
            size="lg"
            asChild
            className="w-full bg-primary px-8 text-primary-foreground hover:bg-primary/90 sm:w-auto"
          >
            <Link href="/auth/signup">Testar 60 dias grátis</Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            asChild
            className="w-full bg-transparent sm:w-auto"
          >
            <Link href="#recursos">Ver recursos →</Link>
          </Button>
        </div>

        <p className="mt-3 text-xs text-foreground/40">
          Cartão necessário · cancele quando quiser
        </p>

        <div className="mx-auto mt-16 max-w-5xl sm:mt-20">
          <div className="relative overflow-hidden rounded-xl border border-foreground/10 bg-foreground/[0.03] shadow-2xl sm:rounded-2xl">
            <div className="flex items-center gap-2 border-b border-foreground/5 px-4 py-3">
              {/* decorative macOS-style window buttons — kept literal, non-semantic */}
              <div className="h-2.5 w-2.5 rounded-full bg-red-500/50 sm:h-3 sm:w-3" />
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/50 sm:h-3 sm:w-3" />
              <div className="h-2.5 w-2.5 rounded-full bg-green-500/50 sm:h-3 sm:w-3" />
            </div>

            <Image
              src="/screenshots/overview.webp"
              alt="Painel de visão geral do ASO mostrando saldo do caixa, serviços recentes, transações e clientes"
              width={1280}
              height={900}
              className="h-auto w-full"
              priority
            />
          </div>

          <div className="mx-auto mt-[-16px] h-6 w-3/4 rounded-full bg-primary/10 blur-xl sm:mt-[-20px] sm:h-8" />
        </div>
      </div>
    </section>
  )
}
