"use client"

import * as React from "react"
import SignaturePad from "signature_pad"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"

interface SignaturePadFieldProps {
  value: string
  onChange: (dataUrl: string) => void
  error?: string
}

export function SignaturePadField({
  value,
  onChange,
  error,
}: SignaturePadFieldProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const padRef = React.useRef<SignaturePad | null>(null)

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ratio = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2)
    canvas.width = canvas.offsetWidth * ratio
    canvas.height = canvas.offsetHeight * ratio
    canvas.getContext("2d")?.scale(ratio, ratio)

    const pad = new SignaturePad(canvas)
    padRef.current = pad
    pad.clear()

    if (value) {
      void pad.fromDataURL(value)
    }

    const handleEndStroke = () => {
      onChange(pad.isEmpty() ? "" : pad.toDataURL("image/png"))
    }
    pad.addEventListener("endStroke", handleEndStroke)

    return () => {
      pad.removeEventListener("endStroke", handleEndStroke)
      pad.off()
      padRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleClear() {
    padRef.current?.clear()
    onChange("")
  }

  return (
    <div className="flex flex-col gap-1.5">
      <canvas
        ref={canvasRef}
        width={400}
        height={150}
        className={cn(
          "max-w-full touch-none rounded-md border border-foreground/[0.08] bg-white",
          error && "border-destructive",
        )}
      />
      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" size="sm" onClick={handleClear}>
          Limpar
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  )
}
