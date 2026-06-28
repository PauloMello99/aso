"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/router"
import { ArrowLeft, User, KeyRound, Palette, Trash2 } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import {
  AccessSection,
  AppearanceSection,
  DangerSection,
  ProfileSection,
} from "./account-sections"

const SECTIONS = [
  { id: "profile", label: "Perfil", icon: User, Section: ProfileSection },
  { id: "access", label: "Acesso", icon: KeyRound, Section: AccessSection },
  { id: "appearance", label: "Tema", icon: Palette, Section: AppearanceSection },
  { id: "danger", label: "Apagar Conta", icon: Trash2, Section: DangerSection },
] as const

export function AccountPage() {
  const router = useRouter()
  const [active, setActive] = React.useState<string>(SECTIONS[0].id)

  // Item 7 — volta para onde estávamos; fallback p/ as organizações.
  function handleBack() {
    if (window.history.length > 1) router.back()
    else void router.push("/dashboard/organizations")
  }

  // Deep-link via #hash: rola para a seção ao montar e quando o hash muda.
  // Reexecuta após um curto atraso porque seções com carga assíncrona (ex.: Perfil)
  // alteram a altura da página depois do primeiro paint.
  React.useEffect(() => {
    function scrollToHash() {
      const id = window.location.hash.replace("#", "")
      if (id) document.getElementById(id)?.scrollIntoView({ behavior: "auto" })
    }
    scrollToHash()
    const t = setTimeout(scrollToHash, 400)
    window.addEventListener("hashchange", scrollToHash)
    return () => {
      clearTimeout(t)
      window.removeEventListener("hashchange", scrollToHash)
    }
  }, [])

  // Scroll-spy: marca a seção visível como ativa na nav.
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id)
        }
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    )
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  return (
    <div className="space-y-6">
      {/* Item 7 — botão voltar */}
      <button
        type="button"
        onClick={handleBack}
        className="flex items-center gap-1.5 text-sm text-foreground/50 transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </button>

      <div className="flex min-h-full flex-col gap-6 md:flex-row md:gap-8">
        {/* Mobile: barra de âncoras horizontal */}
        <nav className="flex gap-1 overflow-x-auto border-b border-foreground/[0.06] pb-3 md:hidden">
          {SECTIONS.map(({ id, label }) => {
            const isDanger = id === "danger"
            const isActive = active === id
            return (
              <Link
                key={id}
                href={`#${id}`}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
                  isActive
                    ? isDanger
                      ? "bg-red-500/10 text-red-400"
                      : "bg-foreground/[0.08] text-foreground"
                    : isDanger
                      ? "text-red-400/60 hover:text-red-400"
                      : "text-foreground/50 hover:bg-foreground/[0.04] hover:text-foreground",
                )}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Desktop: submenu de âncoras fixo à esquerda (sticky) */}
        <aside className="hidden w-48 shrink-0 md:block">
          <div className="sticky top-6">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-foreground/25">
              Minha Conta
            </p>
            <ul className="space-y-0.5">
              {SECTIONS.map(({ id, label, icon: Icon }) => {
                const isDanger = id === "danger"
                const isActive = active === id
                return (
                  <li key={id}>
                    <Link
                      href={`#${id}`}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                        isActive
                          ? isDanger
                            ? "bg-red-500/10 text-red-400"
                            : "bg-foreground/[0.08] text-foreground"
                          : isDanger
                            ? "text-red-400/60 hover:bg-red-500/5 hover:text-red-400"
                            : "text-foreground/50 hover:bg-foreground/[0.04] hover:text-foreground",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isActive
                            ? isDanger
                              ? "text-red-400"
                              : "text-orange-400"
                            : isDanger
                              ? "text-red-400/60"
                              : "text-foreground/40",
                        )}
                      />
                      {label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </aside>

        {/* Sections empilhadas — conteúdo centralizado, com largura máxima */}
        <div className="min-w-0 flex-1">
          <div className="mx-auto max-w-3xl space-y-12">
            {SECTIONS.map(({ id, Section }) => (
              <section key={id} id={id} className="scroll-mt-20">
                <Section />
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
