"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { ImageCropper } from "@/shared/components/image-cropper";
import {
  type CropRect,
  formatBytes,
  isCompressibleImage,
} from "@/shared/lib/image-compression";
import { cropAndCompressImage } from "@/shared/lib/image-crop";

interface ImageCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: File | null;
  aspect?: number | null;
  circular?: boolean;
  maxDimension: number;
  maxBytes: number;
  title?: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: (file: File) => Promise<void>;
}

export function ImageCropDialog({
  open,
  onOpenChange,
  file,
  aspect = null,
  circular = false,
  maxDimension,
  maxBytes,
  title = "Recortar imagem",
  description = "Ajuste a área de recorte antes de enviar.",
  confirmLabel = "Confirmar",
  onConfirm,
}: ImageCropDialogProps) {
  const [cropRect, setCropRect] = React.useState<CropRect | null>(null);
  const [staticPreviewUrl, setStaticPreviewUrl] = React.useState<string | null>(
    null,
  );
  const [resultSize, setResultSize] = React.useState<number | null>(null);
  const [processing, setProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const compressible = file ? isCompressibleImage(file.type) : false;

  React.useEffect(() => {
    if (!open || !file) return;
    setError(null);
    setResultSize(null);
    setCropRect(null);
  }, [open, file]);

  React.useEffect(() => {
    if (!open || !file || compressible) {
      setStaticPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setStaticPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [open, file, compressible]);

  async function handleConfirm() {
    if (!file) return;
    setProcessing(true);
    setError(null);
    try {
      // Non-compressible files (guarded upstream — callers must not open
      // this dialog for them) still degrade gracefully to the original.
      if (!compressible) {
        await onConfirm(file);
        onOpenChange(false);
        return;
      }
      if (!cropRect) {
        throw new Error("Selecione uma área para recortar.");
      }
      const processed = await cropAndCompressImage(file, {
        crop: cropRect,
        maxDimension,
        maxBytes,
      });
      setResultSize(processed.size);
      await onConfirm(processed);
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha ao processar a imagem.",
      );
    } finally {
      setProcessing(false);
    }
  }

  if (!file) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !processing && onOpenChange(next)}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {compressible ? (
          <ImageCropper
            file={file}
            aspect={aspect}
            circular={circular}
            onCropChange={setCropRect}
          />
        ) : (
          <div className="flex max-h-[50vh] items-center justify-center overflow-hidden rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] sm:max-h-[60vh]">
            {staticPreviewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={staticPreviewUrl}
                alt={file.name}
                className="max-h-full w-full object-contain"
              />
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <p className="text-xs text-foreground/50">
            {formatBytes(file.size)}
            {resultSize !== null ? ` → ${formatBytes(resultSize)}` : ""}
          </p>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter showCloseButton>
          <Button
            type="button"
            disabled={processing}
            onClick={() => void handleConfirm()}
          >
            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
