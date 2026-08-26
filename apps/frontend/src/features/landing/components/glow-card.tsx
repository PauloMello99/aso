"use client"

import * as React from "react"

interface GlowCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function GlowCard({ children, className, ...props }: GlowCardProps) {
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const node = ref.current
    if (!node) return

    const syncPointer = (e: PointerEvent) => {
      const rect = node.getBoundingClientRect()
      node.style.setProperty("--glow-x", `${e.clientX - rect.left}px`)
      node.style.setProperty("--glow-y", `${e.clientY - rect.top}px`)
    }

    document.addEventListener("pointermove", syncPointer, { passive: true })
    return () => document.removeEventListener("pointermove", syncPointer)
  }, [])

  return (
    <div ref={ref} data-glow className={className} {...props}>
      {children}
    </div>
  )
}
