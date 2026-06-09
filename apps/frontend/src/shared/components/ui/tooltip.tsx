"use client"

import * as React from "react"
import { Tooltip as TooltipPrimitive } from "radix-ui"
import { cn } from "@/shared/lib/utils"

export const TooltipProvider = TooltipPrimitive.Provider

function TooltipContent({
  className,
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 rounded-md border border-white/10 bg-[#1a1a1d] px-2.5 py-1 text-xs font-medium text-white shadow-xl",
          "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  )
}

interface TooltipProps {
  content: React.ReactNode
  side?: "top" | "right" | "bottom" | "left"
  delayDuration?: number
  children: React.ReactElement
  disabled?: boolean
}

function Tooltip({
  content,
  side = "right",
  delayDuration = 150,
  children,
  disabled = false,
}: TooltipProps) {
  if (disabled) return children
  return (
    <TooltipPrimitive.Root delayDuration={delayDuration}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipContent side={side}>{content}</TooltipContent>
    </TooltipPrimitive.Root>
  )
}

export { Tooltip, TooltipContent }
