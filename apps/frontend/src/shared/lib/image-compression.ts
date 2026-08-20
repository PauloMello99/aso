import { joinFileName, splitFileName } from "@/shared/lib/file-name";

/**
 * Image MIME types the client-side crop/compress pipeline knows how to
 * re-encode via `<canvas>.toBlob`.
 */
export const COMPRESSIBLE_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export type CompressibleImageMimeType =
  (typeof COMPRESSIBLE_IMAGE_MIME_TYPES)[number];

export function isCompressibleImage(mimeType: string): boolean {
  return (COMPRESSIBLE_IMAGE_MIME_TYPES as readonly string[]).includes(
    mimeType,
  );
}

/** A crop rectangle expressed in pixels, in some coordinate space (display or natural). */
export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Clamps a crop rect so it stays fully inside `bounds` and never shrinks
 * below `minSize` on either axis (unless `bounds` itself is smaller than
 * `minSize`, in which case it collapses to `bounds`).
 */
export function clampCropRect(
  rect: CropRect,
  bounds: { width: number; height: number },
  minSize = 24,
): CropRect {
  const maxWidth = Math.max(bounds.width, 0);
  const maxHeight = Math.max(bounds.height, 0);

  const width = Math.min(
    Math.max(rect.width, Math.min(minSize, maxWidth)),
    maxWidth,
  );
  const height = Math.min(
    Math.max(rect.height, Math.min(minSize, maxHeight)),
    maxHeight,
  );

  const x = Math.min(Math.max(rect.x, 0), Math.max(maxWidth - width, 0));
  const y = Math.min(Math.max(rect.y, 0), Math.max(maxHeight - height, 0));

  return { x, y, width, height };
}

/**
 * Shrinks the larger side of `rect` (keeping its center fixed) so its
 * width/height ratio matches `aspect`, then clamps the result to `bounds`.
 * A `null` aspect is a no-op besides the final clamp.
 */
export function applyAspectToRect(
  rect: CropRect,
  aspect: number | null,
  bounds: { width: number; height: number },
): CropRect {
  if (aspect === null || !Number.isFinite(aspect) || aspect <= 0) {
    return clampCropRect(rect, bounds);
  }

  let { width, height } = rect;
  const currentAspect = height > 0 ? width / height : aspect;

  if (currentAspect > aspect) {
    width = height * aspect;
  } else if (currentAspect < aspect) {
    height = width / aspect;
  }

  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;

  return clampCropRect(
    {
      x: centerX - width / 2,
      y: centerY - height / 2,
      width,
      height,
    },
    bounds,
  );
}

/**
 * The initial crop rect for a fresh image: the whole image when `aspect` is
 * `null`, or the largest centered rect matching `aspect` otherwise.
 */
export function defaultCropRect(
  bounds: { width: number; height: number },
  aspect: number | null,
): CropRect {
  if (aspect === null || !Number.isFinite(aspect) || aspect <= 0) {
    return { x: 0, y: 0, width: bounds.width, height: bounds.height };
  }

  const boundsAspect =
    bounds.height > 0 ? bounds.width / bounds.height : aspect;

  let width = bounds.width;
  let height = bounds.height;

  if (boundsAspect > aspect) {
    width = bounds.height * aspect;
  } else if (boundsAspect < aspect) {
    height = bounds.width / aspect;
  }

  return {
    x: (bounds.width - width) / 2,
    y: (bounds.height - height) / 2,
    width,
    height,
  };
}

/**
 * Converts a crop rect expressed in on-screen `display` pixels into the
 * image's `natural` pixel space, rounding to integers and re-clamping to
 * the natural bounds.
 */
export function scaleRectToNatural(
  rect: CropRect,
  display: { width: number; height: number },
  natural: { width: number; height: number },
): CropRect {
  const scaleX = display.width > 0 ? natural.width / display.width : 1;
  const scaleY = display.height > 0 ? natural.height / display.height : 1;

  return clampCropRect(
    {
      x: Math.round(rect.x * scaleX),
      y: Math.round(rect.y * scaleY),
      width: Math.round(rect.width * scaleX),
      height: Math.round(rect.height * scaleY),
    },
    natural,
  );
}

/**
 * The output pixel size for a compressed image: preserves the crop's
 * aspect ratio, never upscales past the crop's own size, and always
 * returns integer values of at least 1px.
 */
export function computeTargetSize(
  cropWidth: number,
  cropHeight: number,
  maxDimension: number,
): { width: number; height: number } {
  const largestSide = Math.max(cropWidth, cropHeight);
  const scale = largestSide > maxDimension ? maxDimension / largestSide : 1;

  return {
    width: Math.max(1, Math.round(cropWidth * scale)),
    height: Math.max(1, Math.round(cropHeight * scale)),
  };
}

/**
 * Quality values to try, from best to most aggressive, when re-encoding via
 * `canvas.toBlob`. `quality` is ignored by the canvas API for lossless
 * formats (PNG), so a single pass is enough there.
 */
export function qualityStepsFor(mimeType: string): number[] {
  if (mimeType === "image/jpeg" || mimeType === "image/webp") {
    return [0.82, 0.7, 0.6];
  }
  return [1];
}

/** Progressively smaller target dimensions to retry compression against. */
export function dimensionStepsFor(maxDimension: number): number[] {
  return [
    maxDimension,
    Math.round(maxDimension * 0.75),
    Math.round(maxDimension * 0.5),
  ];
}

export const EXTENSION_BY_MIME: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};

const EXTENSION_ALIASES_BY_MIME: Record<string, readonly string[]> = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
};

/**
 * Renames `originalName` to match `outputMimeType`. When the original
 * extension is already an accepted alias for that MIME type (e.g. ".JPEG"
 * for "image/jpeg"), the name is returned intact — only a genuine mismatch
 * gets its extension replaced with the canonical one.
 */
export function outputFileName(
  originalName: string,
  outputMimeType: string,
): string {
  const { base, ext } = splitFileName(originalName);
  const normalizedExt = ext.toLowerCase();
  const aliases = EXTENSION_ALIASES_BY_MIME[outputMimeType];

  if (aliases?.includes(normalizedExt)) {
    return originalName;
  }

  const canonicalExt = EXTENSION_BY_MIME[outputMimeType] ?? ext;
  return joinFileName(base, canonicalExt);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
