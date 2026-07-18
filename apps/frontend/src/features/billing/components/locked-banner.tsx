"use client"

import { Lock } from "lucide-react"
import { cn } from "@/shared/lib/utils"

interface LockedBannerProps {
  className?: string
}

export function LockedBanner({ className }: LockedBannerProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4 text-sm text-amber-200",
        className,
      )}
    >
      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
      <p>
        Esta organização está com o acesso de escrita bloqueado — assine para
        continuar usando o sistema.
      </p>
    </div>
  )
}
