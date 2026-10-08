"use client"

import * as React from "react"
import Image from "next/image"
import { ImagePlus, X } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import {
  ACCEPTED_QUOTE_IMAGE_TYPES,
  MAX_QUOTE_IMAGES,
} from "../schemas/quote-form.schema"
import {
  validateQuoteImages,
  type QuoteImageError,
} from "../lib/validate-quote-images"

const ACCEPT = ACCEPTED_QUOTE_IMAGE_TYPES.join(",")
const HEIF_PATTERN = /\.(heic|heif)$/i

function canPreview(file: File): boolean {
  if (file.type === "image/heic" || file.type === "image/heif") return false
  return !HEIF_PATTERN.test(file.name) && file.type.startsWith("image/")
}

interface QuoteImagePickerProps {
  files: File[]
  onChange: (files: File[]) => void
  disabled?: boolean
}

export function QuoteImagePicker({
  files,
  onChange,
  disabled = false,
}: QuoteImagePickerProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [errors, setErrors] = React.useState<QuoteImageError[]>([])
  const full = files.length >= MAX_QUOTE_IMAGES

  function handleSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? [])
    // Permite escolher o mesmo arquivo de novo depois de removê-lo.
    event.target.value = ""
    if (selected.length === 0) return

    const next = [...files, ...selected]
    const found = validateQuoteImages(next)
    if (found.length > 0) {
      setErrors(found)
      return
    }
    setErrors([])
    onChange(next)
  }

  function handleRemove(index: number) {
    setErrors([])
    onChange(files.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="sr-only"
        tabIndex={-1}
        onChange={handleSelect}
        disabled={disabled || full}
      />

      {files.length > 0 && (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {files.map((file, index) => (
            <QuoteImagePreview
              key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
              file={file}
              disabled={disabled}
              onRemove={() => handleRemove(index)}
            />
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || full}
        className={cn(
          "flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-dashed border-foreground/20 px-3 py-2 text-sm text-foreground/60 transition-colors",
          "hover:border-foreground/40 hover:text-foreground",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <ImagePlus className="h-4 w-4" />
        {full
          ? `Limite de ${MAX_QUOTE_IMAGES} imagens atingido`
          : "Adicionar imagens de referência"}
      </button>
      <p className="text-xs text-foreground/40">
        Opcional. Até {MAX_QUOTE_IMAGES} imagens (JPG, PNG, WebP ou HEIC) de até
        5 MB cada.
      </p>

      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            <ul className="flex flex-col gap-1">
              {errors.map((error, index) => (
                <li key={`${error.reason}-${index}`}>{error.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

interface QuoteImagePreviewProps {
  file: File
  disabled: boolean
  onRemove: () => void
}

function QuoteImagePreview({
  file,
  disabled,
  onRemove,
}: QuoteImagePreviewProps) {
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!canPreview(file)) return
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => {
      URL.revokeObjectURL(url)
      setPreviewUrl(null)
    }
  }, [file])

  return (
    <li className="flex items-center gap-2 rounded-md border border-foreground/[0.08] bg-foreground/[0.04] p-2">
      {previewUrl ? (
        <Image
          src={previewUrl}
          alt=""
          width={56}
          height={56}
          unoptimized
          className="h-14 w-14 shrink-0 rounded object-cover"
        />
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-foreground/[0.06] text-foreground/40">
          <ImagePlus className="h-5 w-5" />
        </div>
      )}
      <span className="min-w-0 flex-1 truncate text-xs text-foreground/70">
        {file.name}
      </span>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Remover ${file.name}`}
        className="flex size-11 shrink-0 items-center justify-center rounded-md text-foreground/50 transition-colors hover:bg-foreground/[0.06] hover:text-foreground disabled:opacity-50"
      >
        <X className="h-4 w-4" />
      </button>
    </li>
  )
}
