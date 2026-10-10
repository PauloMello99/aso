"use client"

import * as React from "react"
import { Download, ImageOff } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import {
  FilePreviewDialog,
  type PreviewFile,
} from "@/shared/components/file-preview-dialog"
import { cn } from "@/shared/lib/utils"
import type { QuoteRequestImage } from "../types"

interface QuoteImageGalleryProps {
  images: QuoteRequestImage[]
  imagesUnavailable: boolean
  /** Rebusca o detalhe (gera novas URLs assinadas). */
  onRefetch: () => void
}

interface PreviewableImage extends QuoteRequestImage {
  url: string
}

function isPreviewable(image: QuoteRequestImage): image is PreviewableImage {
  return image.previewable && image.url !== null
}

export function QuoteImageGallery({
  images,
  imagesUnavailable,
  onRefetch,
}: QuoteImageGalleryProps) {
  const [previewIndex, setPreviewIndex] = React.useState<number | null>(null)
  // URL assinada expirada: uma única rebusca automática por abertura do detalhe.
  const refetchedOnErrorRef = React.useRef(false)

  const previewable = React.useMemo(
    () => images.filter(isPreviewable),
    [images],
  )
  const previewFiles = React.useMemo<PreviewFile[]>(
    () =>
      previewable.map((image) => ({
        id: image.id,
        fileName: `referencia-${image.position + 1}`,
        contentType: image.contentType,
        url: image.url,
        downloadUrl: image.downloadUrl ?? undefined,
      })),
    [previewable],
  )

  function handleImageError() {
    if (refetchedOnErrorRef.current) return
    refetchedOnErrorRef.current = true
    onRefetch()
  }

  if (imagesUnavailable) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-warning/20 bg-warning-subtle p-3 text-sm text-warning"
      >
        <p>Não foi possível carregar as imagens agora. Tente novamente em instantes.</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2 h-11 sm:h-9"
          onClick={onRefetch}
        >
          Tentar novamente
        </Button>
      </div>
    )
  }

  if (images.length === 0) {
    return <p className="text-sm text-foreground/40">Sem imagens de referência.</p>
  }

  return (
    <>
      <ul
        className={cn(
          "grid gap-2",
          images.length === 1 ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3",
        )}
      >
        {images.map((image) => {
          const position = image.position + 1
          const previewIdx = previewable.findIndex((p) => p.id === image.id)
          return (
            <li
              key={image.id}
              className="relative aspect-square overflow-hidden rounded-lg border border-foreground/[0.08] bg-foreground/[0.04]"
            >
              {isPreviewable(image) ? (
                <button
                  type="button"
                  className="absolute inset-0 h-full w-full focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Ampliar imagem de referência ${position} de ${images.length}`}
                  onClick={() => setPreviewIndex(previewIdx)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- URL assinada de curta duração; next/image não se aplica */}
                  <img
                    src={image.url}
                    alt={`Imagem de referência ${position} de ${images.length}`}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                    onError={handleImageError}
                  />
                </button>
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-2 text-center">
                  <ImageOff
                    className="h-6 w-6 text-foreground/30"
                    aria-hidden="true"
                  />
                  <p className="text-xs text-foreground/50">
                    Pré-visualização indisponível
                  </p>
                  {image.downloadUrl ? (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-11 sm:h-9"
                    >
                      <a href={image.downloadUrl} download>
                        <Download className="h-4 w-4" aria-hidden="true" />
                        Baixar
                        <span className="sr-only"> imagem {position}</span>
                      </a>
                    </Button>
                  ) : null}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <FilePreviewDialog
        open={previewIndex !== null && previewIndex >= 0}
        onOpenChange={(open) => {
          if (!open) setPreviewIndex(null)
        }}
        files={previewFiles}
        startIndex={previewIndex ?? 0}
      />
    </>
  )
}
