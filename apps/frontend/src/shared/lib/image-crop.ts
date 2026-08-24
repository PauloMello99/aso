import {
  type CropRect,
  computeTargetSize,
  dimensionStepsFor,
  outputFileName,
  qualityStepsFor,
} from "@/shared/lib/image-compression";

interface ImageSource {
  source: CanvasImageSource;
  width: number;
  height: number;
  release(): void;
}

/**
 * Decodes `file` into a drawable canvas source. Prefers `createImageBitmap`
 * (off-main-thread decode, respects EXIF orientation); falls back to an
 * `<img>` + object URL when the API is unavailable or fails.
 */
export async function loadImageSource(file: File): Promise<ImageSource> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch {
      // Fall through to the <img> fallback below.
    }
  }

  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;

  try {
    await img.decode();
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err instanceof Error
      ? err
      : new Error("Não foi possível carregar a imagem.");
  }

  return {
    source: img,
    width: img.naturalWidth,
    height: img.naturalHeight,
    release: () => URL.revokeObjectURL(url),
  };
}

function blobFromCanvas(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

interface CropAndCompressOptions {
  crop: CropRect;
  maxDimension: number;
  maxBytes: number;
}

/**
 * Crops `file` to `crop` (natural-pixel coordinates) and re-encodes it,
 * trying progressively smaller dimensions and quality levels until the
 * result fits under `maxBytes`. Throws if no combination fits.
 */
export async function cropAndCompressImage(
  file: File,
  options: CropAndCompressOptions,
): Promise<File> {
  const { crop, maxDimension, maxBytes } = options;
  const imageSource = await loadImageSource(file);

  try {
    for (const dimension of dimensionStepsFor(maxDimension)) {
      const { width, height } = computeTargetSize(
        crop.width,
        crop.height,
        dimension,
      );

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) continue;

      ctx.drawImage(
        imageSource.source,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        width,
        height,
      );

      for (const quality of qualityStepsFor(file.type)) {
        const blob = await blobFromCanvas(canvas, file.type, quality);
        if (blob && blob.size <= maxBytes) {
          return new File([blob], outputFileName(file.name, file.type), {
            type: file.type,
            lastModified: Date.now(),
          });
        }
      }
    }

    throw new Error(
      "Não foi possível comprimir a imagem abaixo do limite permitido.",
    );
  } finally {
    imageSource.release();
  }
}
