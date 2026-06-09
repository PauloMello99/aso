import * as React from "react"
import { cn } from "@/shared/lib/utils"

interface BackgroundGridProps {
  variant?: "dots" | "none"
  glows?: boolean
  className?: string
}

export function BackgroundGrid({
  variant = "dots",
  glows = true,
  className,
}: BackgroundGridProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
      aria-hidden="true"
    >
      {variant === "dots" && (
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Ccircle cx='1' cy='1' r='1' fill='%23ffffff' fill-opacity='0.25'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
          }}
        />
      )}

      {glows && (
        <>
          <div className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-orange-500/10 blur-[120px]" />
          <div className="absolute -bottom-20 -right-20 h-[500px] w-[500px] rounded-full bg-orange-600/8 blur-[100px]" />
        </>
      )}
    </div>
  )
}
