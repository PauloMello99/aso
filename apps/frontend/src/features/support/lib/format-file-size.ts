const UNITS = ["B", "KB", "MB", "GB"] as const

/**
 * Formata um tamanho em bytes para exibição (ex.: "1.5 MB"). Usa base 1024,
 * arredondando para uma casa decimal a partir de KB.
 */
export function formatFileSize(sizeBytes: number): string {
  if (!Number.isFinite(sizeBytes) || sizeBytes < 0) return "0 B"
  if (sizeBytes < 1024) return `${sizeBytes} B`

  let value = sizeBytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < UNITS.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  return `${value.toFixed(1)} ${UNITS[unitIndex]}`
}
