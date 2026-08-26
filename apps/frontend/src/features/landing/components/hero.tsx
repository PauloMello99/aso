import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/shared/components/ui/button"
import { BackgroundGrid } from "./background-grid"
import { ConstellationGrid } from "./constellation-grid"

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28">
      <BackgroundGrid variant="none" glows={true} />
      <ConstellationGrid />

      <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-10">
        <div className="text-center lg:text-left">
          <h1
            className="animate-hero-in mx-auto max-w-2xl text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-6xl lg:mx-0"
            style={{ animationDelay: "0ms" }}
          >
            Gestão completa para{" "}
            <span className="text-primary">estúdios de tatuagem</span>
          </h1>

          <p
            className="animate-hero-in mx-auto mt-5 max-w-lg text-base leading-relaxed text-foreground/60 sm:text-lg lg:mx-0"
            style={{ animationDelay: "90ms" }}
          >
            Agendamentos, clientes, anamnese e caixa em um único lugar,
            construído para tatuadores, não para qualquer negócio criativo.
          </p>

          <div
            className="animate-hero-in mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4 lg:justify-start"
            style={{ animationDelay: "160ms" }}
          >
            <Button
              size="lg"
              asChild
              className="w-full bg-primary px-8 text-primary-foreground transition-transform duration-150 hover:bg-primary/90 active:scale-[0.98] sm:w-auto"
            >
              <Link href="/auth/signup">Testar 60 dias grátis</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="w-full bg-transparent transition-transform duration-150 active:scale-[0.98] sm:w-auto"
            >
              <Link href="#recursos">Ver recursos</Link>
            </Button>
          </div>

          <p
            className="animate-hero-in mt-4 text-xs text-foreground/40"
            style={{ animationDelay: "220ms" }}
          >
            Cartão necessário, cancele quando quiser
          </p>
        </div>

        <div
          className="animate-hero-in relative lg:translate-y-4"
          style={{ animationDelay: "140ms" }}
        >
          <div className="relative overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/[0.03] shadow-2xl">
            <Image
              src="/screenshots/overview.webp"
              alt="Painel de visão geral do ASO mostrando saldo do caixa, serviços recentes, transações e clientes"
              width={1280}
              height={900}
              className="h-auto w-full"
              priority
            />
          </div>

          <div className="absolute -bottom-6 -left-6 -z-10 h-32 w-32 rounded-full bg-primary/20 blur-3xl sm:h-40 sm:w-40" />
          <div className="absolute -right-8 -top-8 -z-10 h-24 w-24 rounded-full bg-primary/10 blur-2xl sm:h-32 sm:w-32" />
        </div>
      </div>
    </section>
  )
}
