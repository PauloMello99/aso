import * as React from "react"
import Link from "next/link"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"
import { BackgroundGrid } from "./background-grid"

export function Hero() {
  return (
    <section className="relative overflow-hidden py-20 md:py-40">
      <BackgroundGrid variant="dots" glows={true} />

      <div className="relative z-10 mx-auto max-w-7xl px-4 text-center sm:px-6">
        <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl md:text-7xl">
          Gestão completa para
          <br />
          <span className="text-primary">estúdios criativos</span>
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-foreground/60 sm:mt-6 sm:text-lg">
          Agendamentos, clientes, financeiro e equipe em um único lugar.
          Construído para tatuadores, fotógrafos e artistas independentes.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:mt-10 sm:flex-row sm:gap-4">
          <Button
            size="lg"
            asChild
            className="w-full bg-primary px-8 text-primary-foreground hover:bg-primary/90 sm:w-auto"
          >
            <Link href="/auth/signup">Começar grátis</Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full bg-transparent sm:w-auto"
          >
            Ver demonstração →
          </Button>
        </div>

        <div className="mx-auto mt-16 max-w-5xl sm:mt-20">
          <div className="relative overflow-hidden rounded-xl border border-foreground/10 bg-foreground/[0.03] shadow-2xl sm:rounded-2xl">
            <div className="flex items-center gap-2 border-b border-foreground/5 px-4 py-3">
              {/* decorative macOS-style window buttons — kept literal, non-semantic */}
              <div className="h-2.5 w-2.5 rounded-full bg-red-500/50 sm:h-3 sm:w-3" />
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/50 sm:h-3 sm:w-3" />
              <div className="h-2.5 w-2.5 rounded-full bg-green-500/50 sm:h-3 sm:w-3" />
            </div>

            <div className="bg-foreground/5 p-px">
              <div className="flex">
                <div className="hidden w-[120px] shrink-0 bg-background p-3 sm:block sm:w-[140px] md:w-[160px]">
                  <div className="mb-4 h-2 w-12 rounded-full bg-foreground/10" />
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="mb-3 flex items-center gap-2">
                      <div className="h-3.5 w-3.5 shrink-0 rounded bg-foreground/10" />
                      <div
                        className="h-1.5 rounded-full bg-foreground/10"
                        style={{ width: `${40 + (i % 3) * 20}%` }}
                      />
                    </div>
                  ))}
                </div>

                <div className="flex-1 bg-background p-4 sm:p-5 md:p-6">
                  <div className="mb-4 grid grid-cols-3 gap-2 sm:mb-6 sm:gap-4">
                    {["Agendamentos", "Clientes", "Receita"].map((label, i) => (
                      <div
                        key={label}
                        className="rounded-lg border border-foreground/5 bg-foreground/[0.02] p-2.5 sm:rounded-xl sm:p-4"
                      >
                        <div className="mb-1 h-1.5 w-10 rounded-full bg-foreground/10 sm:mb-2 sm:h-2 sm:w-16" />
                        <div
                          className={cn(
                            "text-base font-bold sm:text-2xl",
                            i === 2 ? "text-primary" : "text-foreground",
                          )}
                        >
                          {i === 0 ? "24" : i === 1 ? "142" : "R$8.4k"}
                        </div>
                        <div className="mt-0.5 text-[10px] text-foreground/30 sm:mt-1 sm:text-xs">
                          {label}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex h-20 items-end gap-1.5 rounded-lg border border-foreground/5 bg-foreground/[0.02] p-2 sm:h-32 sm:gap-2.5 sm:rounded-xl sm:p-4">
                    {[30, 45, 38, 60, 52, 75, 68, 90, 72, 85, 95, 80].map(
                      (h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t-sm"
                          style={{
                            height: `${h}%`,
                            background: `color-mix(in oklch, var(--primary) ${20 + h / 2}%, transparent)`,
                          }}
                        />
                      ),
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto mt-[-16px] h-6 w-3/4 rounded-full bg-primary/10 blur-xl sm:mt-[-20px] sm:h-8" />
        </div>
      </div>
    </section>
  )
}
