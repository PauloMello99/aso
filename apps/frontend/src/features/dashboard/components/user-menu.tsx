"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/router"
import { Settings, LogOut, ChevronDown } from "lucide-react"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { cn } from "@/shared/lib/utils"

export function UserMenu() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  // Close on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const handleSignOut = async () => {
    setOpen(false)
    await signOut()
    await router.replace("/auth/login")
  }

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "??"

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500/20 text-xs font-medium text-orange-400">
          {initials}
        </span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-56 rounded-lg border border-white/10 bg-[#1a1a1d] py-1 shadow-xl">
          {/* Email */}
          <div className="px-3 py-2 text-xs text-white/40">{user?.email}</div>
          <div className="my-1 h-px bg-white/5" />

          {/* Menu items */}
          <Link
            href="/dashboard/preferences"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Settings className="h-4 w-4" />
            Preferências
          </Link>

          <div className="my-1 h-px bg-white/5" />

          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      )}
    </div>
  )
}
