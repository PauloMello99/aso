import * as React from "react"
import Link from "next/link"
import { ShieldCheck, Lock, FileCheck, EyeOff } from "lucide-react"
import { LEGAL_ROUTES } from "@/features/legal"
import { Reveal } from "./reveal"

const SECURITY_ITEMS = [
  {
    icon: ShieldCheck,
    title: "Isolamento por estúdio",
    description:
      "Cada organização só enxerga os próprios dados, garantido no banco, não só na aplicação.",
  },
  {
    icon: Lock,
    title: "Caixa imutável",
    description:
      "Lançamento nunca é editado nem apagado; correção gera errata rastreável.",
  },
  {
    icon: FileCheck,
    title: "Anamnese conforme a LGPD",
    description:
      "Dado de saúde é sensível. O consentimento é gerado no servidor, versionado e impresso no PDF assinado.",
  },
  {
    icon: EyeOff,
    title: "Sem rastreadores",
    description:
      "Nenhum Google Analytics, pixel ou cookie de terceiros. Fontes servidas pelo próprio domínio.",
  },
]

export function SecuritySection() {
  return (
    <section id="seguranca" className="bg-foreground/[0.02] py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Seus dados, isolados e protegidos
            </h2>
            <p className="mt-4 text-foreground/50">
              Cada estúdio só enxerga os próprios dados, garantido no banco,
              não só na aplicação.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {SECURITY_ITEMS.map((item, index) => {
              const Icon = item.icon
              return (
                <Reveal key={item.title} delay={index * 60} className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="mb-1 text-base font-semibold text-foreground">
                      {item.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-foreground/50">
                      {item.description}
                    </p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>

        <p className="mx-auto mt-12 max-w-2xl text-center text-xs text-foreground/40">
          Cada estúdio é o controlador dos dados dos seus clientes; o ASO atua
          como operador. Saiba mais nos{" "}
          <Link
            href={LEGAL_ROUTES.terms}
            className="underline underline-offset-2 hover:text-foreground/60"
          >
            Termos
          </Link>
          ,{" "}
          <Link
            href={LEGAL_ROUTES.privacy}
            className="underline underline-offset-2 hover:text-foreground/60"
          >
            Privacidade
          </Link>
          ,{" "}
          <Link
            href={LEGAL_ROUTES.cookies}
            className="underline underline-offset-2 hover:text-foreground/60"
          >
            Cookies
          </Link>{" "}
          e{" "}
          <Link
            href={LEGAL_ROUTES.dpa}
            className="underline underline-offset-2 hover:text-foreground/60"
          >
            Tratamento de Dados
          </Link>
          .
        </p>
      </div>
    </section>
  )
}
