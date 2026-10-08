import {
  ACCEPTED_QUOTE_IMAGE_TYPES,
  MAX_QUOTE_IMAGES,
  MAX_QUOTE_IMAGE_BYTES,
} from "../schemas/quote-form.schema"

export type QuoteImageErrorReason = "count" | "size" | "type"

export interface QuoteImageError {
  reason: QuoteImageErrorReason
  message: string
  /** Nome do arquivo afetado (ausente no erro de quantidade). */
  fileName?: string
}

const HEIF_EXTENSION_PATTERN = /\.(heic|heif)$/i

function isAcceptedType(file: File): boolean {
  if (file.type) {
    return (ACCEPTED_QUOTE_IMAGE_TYPES as readonly string[]).includes(file.type)
  }
  // iOS costuma entregar HEIC/HEIF com `type` vazio: cai para a extensão.
  return HEIF_EXTENSION_PATTERN.test(file.name)
}

/**
 * Validação client-side só para UX (feedback imediato). O backend decide o tipo
 * real por magic bytes e revalida quantidade e tamanho.
 */
export function validateQuoteImages(files: File[]): QuoteImageError[] {
  const errors: QuoteImageError[] = []

  if (files.length > MAX_QUOTE_IMAGES) {
    errors.push({
      reason: "count",
      message: `Envie no máximo ${MAX_QUOTE_IMAGES} imagens.`,
    })
  }

  for (const file of files) {
    if (!isAcceptedType(file)) {
      errors.push({
        reason: "type",
        fileName: file.name,
        message: `"${file.name}" não é um formato aceito (JPG, PNG, WebP ou HEIC).`,
      })
    } else if (file.size > MAX_QUOTE_IMAGE_BYTES) {
      errors.push({
        reason: "size",
        fileName: file.name,
        message: `"${file.name}" passa de ${MAX_QUOTE_IMAGE_BYTES / (1024 * 1024)} MB.`,
      })
    }
  }

  return errors
}
