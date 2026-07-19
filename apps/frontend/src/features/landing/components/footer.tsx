import * as React from "react"
import Link from "next/link"
import { Globe, AtSign, Link2 } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Separator } from "@/shared/components/ui/separator"
import { BrandWordmark } from "@/shared/components/brand-wordmark"

const FOOTER_LINKS = {
  Produto: [
    { label: "Recursos", href: "#recursos" },
    { label: "Integrações", href: "#integracoes" },
    { label: "Preços", href: "#precos" },
    { label: "Changelog", href: "#" },
    { label: "Roadmap", href: "#" },
  ],
  Empresa: [
    { label: "Sobre", href: "#sobre" },
    { label: "Blog", href: "#" },
    { label: "Carreiras", href: "#" },
    { label: "Imprensa", href: "#" },
  ],
  Legal: [
    { label: "Termos de uso", href: "#" },
    { label: "Privacidade", href: "#" },
    { label: "Cookies", href: "#" },
    { label: "Segurança", href: "#" },
  ],
}

const SOCIAL_LINKS = [
  { Icon: Globe, href: "https://inkops.com.br", label: "Site" },
  { Icon: AtSign, href: "https://instagram.com", label: "Instagram" },
  { Icon: Link2, href: "https://github.com", label: "GitHub" },
]

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

            <div className="mt-6">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-foreground/30">
                Novidades por e-mail
              </p>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  className="h-9 border-foreground/10 bg-foreground/5 text-sm text-foreground placeholder:text-foreground/30 focus-visible:ring-ring/50"
                />
                <Button
                  size="sm"
                  className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Assinar
                </Button>
              </div>
            </div>
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

        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-foreground/30">
            © {new Date().getFullYear()} ASO. Todos os direitos reservados.
          </p>

          <div className="flex items-center gap-4">
            {SOCIAL_LINKS.map(({ Icon, href, label }) => (
              <Link
                key={label}
                href={href}
                aria-label={label}
                className="text-foreground/30 transition-colors hover:text-foreground"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon className="h-4 w-4" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
