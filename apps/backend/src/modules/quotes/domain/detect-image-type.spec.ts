import { detectImageType } from "./detect-image-type";

function bytes(...values: number[]): Buffer {
  return Buffer.concat([Buffer.from(values), Buffer.alloc(16)]);
}

function ascii(text: string, offset: number): Buffer {
  const buffer = Buffer.alloc(16);
  buffer.write(text, offset, "latin1");
  return buffer;
}

function withAscii(buffer: Buffer, text: string, offset: number): Buffer {
  buffer.write(text, offset, "latin1");
  return buffer;
}

describe("detectImageType", () => {
  it("detects JPEG", () => {
    expect(detectImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toEqual({
      mime: "image/jpeg",
      ext: "jpg",
    });
  });

  it("detects PNG", () => {
    expect(
      detectImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)),
    ).toEqual({ mime: "image/png", ext: "png" });
  });

  it("detects WebP", () => {
    const buffer = withAscii(ascii("RIFF", 0), "WEBP", 8);
    expect(detectImageType(buffer)).toEqual({ mime: "image/webp", ext: "webp" });
  });

  it.each(["heic", "heix", "hevc", "hevx", "heim", "heis"])(
    "detects HEIC with brand %s",
    (brand) => {
      const buffer = withAscii(ascii("ftyp", 4), brand, 8);
      expect(detectImageType(buffer)).toEqual({
        mime: "image/heic",
        ext: "heic",
      });
    },
  );

  it.each(["mif1", "msf1"])("detects HEIF with brand %s", (brand) => {
    const buffer = withAscii(ascii("ftyp", 4), brand, 8);
    expect(detectImageType(buffer)).toEqual({ mime: "image/heif", ext: "heif" });
  });

  it("rejects PDF", () => {
    expect(detectImageType(withAscii(Buffer.alloc(16), "%PDF-1.7", 0))).toBeNull();
  });

  it("rejects GIF", () => {
    expect(detectImageType(withAscii(Buffer.alloc(16), "GIF89a", 0))).toBeNull();
  });

  it("rejects plain text regardless of claimed extension", () => {
    expect(
      detectImageType(Buffer.from("this is just text pretending to be a jpg")),
    ).toBeNull();
  });

  it("rejects buffers shorter than 12 bytes", () => {
    expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff]))).toBeNull();
  });

  it.each(["isom", "mp42"])("rejects ftyp with video brand %s", (brand) => {
    const buffer = withAscii(ascii("ftyp", 4), brand, 8);
    expect(detectImageType(buffer)).toBeNull();
  });

  it("rejects RIFF that is not WebP", () => {
    const buffer = withAscii(ascii("RIFF", 0), "WAVE", 8);
    expect(detectImageType(buffer)).toBeNull();
  });
});
