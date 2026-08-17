"use client"

import * as React from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { BrandWordmark } from "@/shared/components/brand-wordmark"
import { cn } from "@/shared/lib/utils"

const NAV_LINKS = [
  { label: "Recursos", href: "#recursos" },
  { label: "Segurança", href: "#seguranca" },
  { label: "Preços", href: "#precos" },
  { label: "Perguntas", href: "#faq" },
]

export function Nav() {
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [scrolled, setScrolled] = React.useState(false)

  const closeMenu = () => setMobileOpen(false)

  React.useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80)
    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-foreground/5 bg-background/90 backdrop-blur-md"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/">
          <BrandWordmark className="text-xl font-bold tracking-tight text-foreground" />
        </Link>

        <ul className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-sm text-foreground/60 transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="hidden bg-transparent text-foreground/70 sm:flex"
          >
            <Link href="/auth/login">Entrar</Link>
          </Button>
          <Button
            size="sm"
            asChild
            className="hidden bg-primary text-primary-foreground hover:bg-primary/90 sm:flex"
          >
            <Link href="/auth/signup">Testar 60 dias grátis</Link>
          </Button>

          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-foreground/60 transition-colors hover:bg-foreground/[0.06] hover:text-foreground md:hidden"
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-foreground/5 md:hidden">
          <nav className="flex flex-col gap-1 px-4 py-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className="rounded-md px-3 py-2.5 text-sm text-foreground/70 transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-col gap-2 border-t border-foreground/5 px-4 pb-4 pt-3">
            <Button
              variant="outline"
              asChild
              className="w-full bg-transparent text-foreground/70"
              onClick={closeMenu}
            >
              <Link href="/auth/login">Entrar</Link>
            </Button>
            <Button
              asChild
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={closeMenu}
            >
              <Link href="/auth/signup">Testar 60 dias grátis</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}
