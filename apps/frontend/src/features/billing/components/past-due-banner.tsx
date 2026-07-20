"use client"

import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import { cn } from "@/shared/lib/utils"

interface PastDueBannerProps {
  isOwner: boolean
  subscriptionHref: string
  className?: string
}

export function PastDueBanner({
  isOwner,
  subscriptionHref,
  className,
}: PastDueBannerProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-xl border border-warning/20 bg-warning-subtle p-4 text-sm text-warning",
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <p>
        Não conseguimos confirmar o último pagamento desta organização — os
        módulos continuam liberados durante o período de tolerância
        {isOwner ? (
          <>
            .{" "}
            <Link
              href={subscriptionHref}
              className="font-medium underline underline-offset-2"
            >
              Atualizar pagamento
            </Link>
          </>
        ) : (
          ", peça ao proprietário para atualizar a forma de pagamento."
        )}
      </p>
    </div>
  )
}
