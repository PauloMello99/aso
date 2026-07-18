"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/router"
import { ArrowLeft, User, KeyRound, Palette, Trash2 } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { useOrgs } from "@/features/dashboard/hooks/use-orgs"
import { shouldShowDeleteAccount } from "@/features/account/lib/can-delete-account"
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
  const { orgs, loading: orgsLoading } = useOrgs()
  const [active, setActive] = React.useState<string>(SECTIONS[0].id)

  const sections = React.useMemo(
    () =>
      SECTIONS.filter(
        ({ id }) => id !== "danger" || orgsLoading || shouldShowDeleteAccount(orgs),
      ),
    [orgs, orgsLoading],
  )

  function handleBack() {
    if (window.history.length > 1) router.back()
    else void router.push("/dashboard/organizations")
  }

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

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id)
        }
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    )
    sections.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [sections])

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={handleBack}
        className="flex items-center gap-1.5 text-sm text-foreground/50 transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </button>

      <div className="flex min-h-full flex-col gap-6 md:flex-row md:gap-8">
        <nav className="flex gap-1 overflow-x-auto border-b border-foreground/[0.06] pb-3 md:hidden">
          {sections.map(({ id, label }) => {
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

        <aside className="hidden w-48 shrink-0 md:block">
          <div className="sticky top-6">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-foreground/25">
              Minha Conta
            </p>
            <ul className="space-y-0.5">
              {sections.map(({ id, label, icon: Icon }) => {
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

        <div className="min-w-0 flex-1">
          <div className="mx-auto max-w-3xl space-y-12">
            {sections.map(({ id, Section }) => (
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
