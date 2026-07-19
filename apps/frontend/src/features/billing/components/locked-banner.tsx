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
        "flex items-start gap-2.5 rounded-xl border border-warning/20 bg-warning/[0.06] p-4 text-sm text-warning",
        className,
      )}
    >
      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <p>
        Esta organização está com o acesso de escrita bloqueado — assine para
        continuar usando o sistema.
      </p>
    </div>
  )
}
