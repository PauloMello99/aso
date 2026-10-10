export const MAX_QUOTE_IMAGES = 3;
export const MAX_QUOTE_IMAGE_BYTES = 5 * 1024 * 1024;

export type DetectedImageType = {
  mime: "image/jpeg" | "image/png" | "image/webp" | "image/heic" | "image/heif";
  ext: "jpg" | "png" | "webp" | "heic" | "heif";
};

const MIN_HEADER_BYTES = 12;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis"]);
const HEIF_BRANDS = new Set(["mif1", "msf1"]);

function asciiAt(buffer: Buffer, start: number, end: number): string {
  return buffer.toString("latin1", start, end);
}

// O tipo vem SEMPRE dos magic bytes; o content-type/nome enviado pelo cliente
// nunca e consultado.
export function detectImageType(buffer: Buffer): DetectedImageType | null {
  if (buffer.length < MIN_HEADER_BYTES) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }

  if (PNG_SIGNATURE.every((byte, index) => buffer[index] === byte)) {
    return { mime: "image/png", ext: "png" };
  }

  if (asciiAt(buffer, 0, 4) === "RIFF" && asciiAt(buffer, 8, 12) === "WEBP") {
    return { mime: "image/webp", ext: "webp" };
  }

  if (asciiAt(buffer, 4, 8) === "ftyp") {
    const brand = asciiAt(buffer, 8, 12);
    if (HEIC_BRANDS.has(brand)) return { mime: "image/heic", ext: "heic" };
    if (HEIF_BRANDS.has(brand)) return { mime: "image/heif", ext: "heif" };
  }

  return null;
}
