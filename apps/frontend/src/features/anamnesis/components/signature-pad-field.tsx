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

/**
 * Canvas de assinatura via `signature_pad` (biblioteca pura, sem wrapper
 * React) — inicializado/destruído no ciclo de vida do componente. Escala o
 * canvas pelo `devicePixelRatio` (capado em 2x) para não borrar em telas
 * HiDPI sem deixar o PNG exportado grande demais para o
 * `@MaxLength(80_000)` do DTO — em telas com DPR 3-4x (comum em celulares),
 * um traço denso sem o cap poderia se aproximar do limite.
 */
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
    // Redimensionar o canvas o limpa; garante que isEmpty() fique correto.
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
          "max-w-full touch-none rounded-md border border-foreground/[0.08] bg-foreground/[0.04]",
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
