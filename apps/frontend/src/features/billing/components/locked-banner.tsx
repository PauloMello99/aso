"use client"

import Link from "next/link"
import { Lock } from "lucide-react"
import { cn } from "@/shared/lib/utils"

interface LockedBannerProps {
  isOwner: boolean
  subscriptionHref: string
  className?: string
}

export function LockedBanner({
  isOwner,
  subscriptionHref,
  className,
}: LockedBannerProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive-subtle p-4 text-sm text-destructive",
        className,
      )}
    >
      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <p>
        Esta organização está sem assinatura ativa — os módulos ficam
        disponíveis apenas para leitura
        {isOwner ? (
          <>
            .{" "}
            <Link
              href={subscriptionHref}
              className="font-medium underline underline-offset-2"
            >
              Assinar agora
            </Link>
          </>
        ) : (
          ", peça ao proprietário para assinar."
        )}
      </p>
    </div>
  )
}
