import { describe, expect, it } from "vitest";
import {
  applyAspectToRect,
  clampCropRect,
  computeTargetSize,
  defaultCropRect,
  isCompressibleImage,
  outputFileName,
  qualityStepsFor,
  scaleRectToNatural,
} from "./image-compression";

describe("isCompressibleImage", () => {
  it("accepts png, jpeg and webp", () => {
    expect(isCompressibleImage("image/png")).toBe(true);
    expect(isCompressibleImage("image/jpeg")).toBe(true);
    expect(isCompressibleImage("image/webp")).toBe(true);
  });

  it("rejects unsupported mime types", () => {
    expect(isCompressibleImage("image/gif")).toBe(false);
    expect(isCompressibleImage("application/pdf")).toBe(false);
  });
});

describe("computeTargetSize", () => {
  it("never upscales past the crop's own size", () => {
    expect(computeTargetSize(200, 100, 1600)).toEqual({
      width: 200,
      height: 100,
    });
  });

  it("preserves proportion when downscaling", () => {
    expect(computeTargetSize(2000, 1000, 1000)).toEqual({
      width: 1000,
      height: 500,
    });
  });

  it("returns integer values", () => {
    const { width, height } = computeTargetSize(1001, 667, 800);
    expect(Number.isInteger(width)).toBe(true);
    expect(Number.isInteger(height)).toBe(true);
  });
});

describe("defaultCropRect", () => {
  it("returns the whole image when aspect is null", () => {
    expect(defaultCropRect({ width: 1200, height: 800 }, null)).toEqual({
      x: 0,
      y: 0,
      width: 1200,
      height: 800,
    });
  });

  it("centers a square crop on a wider image", () => {
    expect(defaultCropRect({ width: 1200, height: 800 }, 1)).toEqual({
      x: 200,
      y: 0,
      width: 800,
      height: 800,
    });
  });
});

describe("clampCropRect / applyAspectToRect", () => {
  it("keeps the rect fully inside bounds", () => {
    const clamped = clampCropRect(
      { x: 1100, y: 700, width: 300, height: 300 },
      { width: 1200, height: 800 },
    );
    expect(clamped.x + clamped.width).toBeLessThanOrEqual(1200);
    expect(clamped.y + clamped.height).toBeLessThanOrEqual(800);
    expect(clamped.x).toBeGreaterThanOrEqual(0);
    expect(clamped.y).toBeGreaterThanOrEqual(0);
  });

  it("never shrinks below minSize", () => {
    const clamped = clampCropRect(
      { x: 0, y: 0, width: 5, height: 5 },
      { width: 1200, height: 800 },
      24,
    );
    expect(clamped.width).toBeGreaterThanOrEqual(24);
    expect(clamped.height).toBeGreaterThanOrEqual(24);
  });

  it("applies the aspect ratio without overflowing bounds", () => {
    const result = applyAspectToRect(
      { x: 900, y: 600, width: 300, height: 200 },
      1,
      { width: 1200, height: 800 },
    );
    expect(result.width).toBeCloseTo(result.height, 5);
    expect(result.x).toBeGreaterThanOrEqual(0);
    expect(result.y).toBeGreaterThanOrEqual(0);
    expect(result.x + result.width).toBeLessThanOrEqual(1200);
    expect(result.y + result.height).toBeLessThanOrEqual(800);
  });
});

describe("scaleRectToNatural", () => {
  it("scales display coordinates up to natural size", () => {
    expect(
      scaleRectToNatural(
        { x: 10, y: 20, width: 100, height: 50 },
        { width: 400, height: 300 },
        { width: 1200, height: 900 },
      ),
    ).toEqual({ x: 30, y: 60, width: 300, height: 150 });
  });
});

describe("outputFileName", () => {
  it("keeps the name intact when the extension already matches the mime", () => {
    expect(outputFileName("foto.JPEG", "image/jpeg")).toBe("foto.JPEG");
  });

  it("appends the canonical extension when there is none", () => {
    expect(outputFileName("foto", "image/png")).toBe("foto.png");
  });

  it("replaces a mismatched extension", () => {
    expect(outputFileName("foto.png", "image/jpeg")).toBe("foto.jpg");
  });
});

describe("qualityStepsFor", () => {
  it("returns a single lossless pass for png", () => {
    expect(qualityStepsFor("image/png")).toEqual([1]);
  });

  it("returns descending quality steps for jpeg/webp", () => {
    expect(qualityStepsFor("image/jpeg")).toEqual([0.82, 0.7, 0.6]);
    expect(qualityStepsFor("image/webp")).toEqual([0.82, 0.7, 0.6]);
  });
});
