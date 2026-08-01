import * as React from "react"
import Link from "next/link"
import { Separator } from "@/shared/components/ui/separator"
import { BrandWordmark } from "@/shared/components/brand-wordmark"
import { LEGAL_ENTITY, LEGAL_ROUTES } from "@/features/legal"

const FOOTER_LINKS = {
  Produto: [
    { label: "Recursos", href: "#recursos" },
    { label: "Integrações", href: "#integracoes" },
    { label: "Preços", href: "#precos" },
  ],
  Empresa: [{ label: "Sobre", href: "#sobre" }],
  Legal: [
    { label: "Termos de uso", href: LEGAL_ROUTES.terms },
    { label: "Privacidade", href: LEGAL_ROUTES.privacy },
    { label: "Cookies", href: LEGAL_ROUTES.cookies },
    { label: "Tratamento de dados", href: LEGAL_ROUTES.dpa },
  ],
}

export function Footer() {
  return (
    <footer className="border-t border-foreground/5 bg-background">
      <div className="mx-auto max-w-7xl px-4 pb-6 pt-12 sm:px-6 sm:pb-8 sm:pt-16">
        <div className="grid grid-cols-2 gap-8 sm:gap-12 md:grid-cols-5">
          <div className="col-span-2 md:col-span-2">
            <Link href="/">
              <BrandWordmark className="text-xl font-bold tracking-tight text-foreground" />
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-foreground/40">
              Gestão completa para estúdios criativos. Agendamentos, clientes e
              financeiro em um só lugar.
            </p>
          </div>

          {Object.entries(FOOTER_LINKS).map(([section, links]) => (
            <div key={section}>
              <p className="mb-4 text-xs font-medium uppercase tracking-wider text-foreground/30">
                {section}
              </p>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-foreground/50 transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8 bg-foreground/5" />

        <p className="text-center text-xs text-foreground/30 sm:text-left">
          © {new Date().getFullYear()} ASO. Todos os direitos reservados.
        </p>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-foreground/25 sm:text-left">
          {LEGAL_ENTITY.razaoSocial} · CNPJ {LEGAL_ENTITY.cnpj} ·{" "}
          {LEGAL_ENTITY.endereco} ·{" "}
          <a
            href={`mailto:${LEGAL_ENTITY.emailContato}`}
            className="hover:text-foreground/50"
          >
            {LEGAL_ENTITY.emailContato}
          </a>
        </p>
      </div>
    </footer>
  )
}
