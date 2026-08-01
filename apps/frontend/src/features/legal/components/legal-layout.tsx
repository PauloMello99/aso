import * as React from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { BrandWordmark } from "@/shared/components/brand-wordmark"

interface LegalLayoutProps {
  title: string
  version: string
  children: React.ReactNode
}

export function LegalLayout({ title, version, children }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-foreground/5">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/">
            <BrandWordmark className="text-lg font-bold" />
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-foreground/50 transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-foreground/40">
          Última atualização: {version}
        </p>

        <div className="mt-6 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-amber-600 dark:text-amber-400">
          Minuta em revisão. Este documento é uma versão preliminar e está sujeito a
          revisão jurídica formal antes da vigência definitiva.
        </div>

        <div className="prose-legal mt-8 space-y-6 text-sm leading-relaxed text-foreground/70 sm:text-base">
          {children}
        </div>
      </main>
    </div>
  )
}

interface LegalSectionProps {
  heading: string
  children: React.ReactNode
}

export function LegalSection({ heading, children }: LegalSectionProps) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-foreground sm:text-lg">
        {heading}
      </h2>
      <div className="space-y-3 text-foreground/60">{children}</div>
    </section>
  )
}
