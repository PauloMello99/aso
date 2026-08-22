"use client";

import * as React from "react";
import { cn } from "@/shared/lib/utils";
import {
  type CropRect,
  applyAspectToRect,
  clampCropRect,
  defaultCropRect,
  scaleRectToNatural,
} from "@/shared/lib/image-compression";

type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const CORNERS: Corner[] = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
];

interface Size {
  width: number;
  height: number;
}

interface DragState {
  mode: "move" | "resize";
  corner?: Corner;
  startX: number;
  startY: number;
  startRect: CropRect;
}

interface ImageCropperProps {
  file: File;
  aspect?: number | null;
  circular?: boolean;
  onCropChange: (crop: CropRect | null) => void;
  className?: string;
}

function resizeRect(
  start: CropRect,
  corner: Corner | undefined,
  dx: number,
  dy: number,
): CropRect {
  if (!corner) return start;

  let { x, y, width, height } = start;

  if (corner === "top-left") {
    x += dx;
    y += dy;
    width -= dx;
    height -= dy;
  } else if (corner === "top-right") {
    y += dy;
    width += dx;
    height -= dy;
  } else if (corner === "bottom-left") {
    x += dx;
    width -= dx;
    height += dy;
  } else {
    width += dx;
    height += dy;
  }

  return { x, y, width, height };
}

export function ImageCropper({
  file,
  aspect = null,
  circular = false,
  onCropChange,
  className,
}: ImageCropperProps) {
  const imgRef = React.useRef<HTMLImageElement>(null);
  const dragStateRef = React.useRef<DragState | null>(null);
  const onCropChangeRef = React.useRef(onCropChange);

  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [natural, setNatural] = React.useState<Size | null>(null);
  const [display, setDisplay] = React.useState<Size | null>(null);
  const [rect, setRect] = React.useState<CropRect | null>(null);

  React.useEffect(() => {
    onCropChangeRef.current = onCropChange;
  }, [onCropChange]);

  React.useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setNatural(null);
    setDisplay(null);
    setRect(null);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  React.useEffect(() => {
    if (!rect || !natural || !display) {
      onCropChangeRef.current(null);
      return;
    }
    onCropChangeRef.current(scaleRectToNatural(rect, display, natural));
  }, [rect, natural, display]);

  // Tracks the img element's *painted* box (transform-immune, fires once
  // layout settles — including after the dialog's open transition), and
  // resets the crop whenever it changes size (dialog animation, viewport
  // resize, orientation change).
  React.useEffect(() => {
    const img = imgRef.current;
    if (!img || !previewUrl) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const nextDisplay = {
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      };
      if (nextDisplay.width <= 0 || nextDisplay.height <= 0) return;
      setDisplay(nextDisplay);
      setRect(defaultCropRect(nextDisplay, aspect));
    });
    observer.observe(img);
    return () => observer.disconnect();
  }, [previewUrl, aspect]);

  function handleImageLoad() {
    const img = imgRef.current;
    if (!img) return;
    setNatural({ width: img.naturalWidth, height: img.naturalHeight });
  }

  function handleSelectAll() {
    if (!display) return;
    setRect(defaultCropRect(display, aspect));
  }

  function handleSurfacePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!rect) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const pointerX = event.clientX - bounds.left;
    const pointerY = event.clientY - bounds.top;
    const insideRect =
      pointerX >= rect.x &&
      pointerX <= rect.x + rect.width &&
      pointerY >= rect.y &&
      pointerY <= rect.y + rect.height;
    if (!insideRect) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      mode: "move",
      startX: event.clientX,
      startY: event.clientY,
      startRect: rect,
    };
  }

  function handleHandlePointerDown(corner: Corner) {
    return (event: React.PointerEvent<HTMLDivElement>) => {
      if (!rect) return;
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      dragStateRef.current = {
        mode: "resize",
        corner,
        startX: event.clientX,
        startY: event.clientY,
        startRect: rect,
      };
    };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;
    if (!dragState || !display) return;

    const dx = event.clientX - dragState.startX;
    const dy = event.clientY - dragState.startY;

    const moved: CropRect =
      dragState.mode === "move"
        ? {
            ...dragState.startRect,
            x: dragState.startRect.x + dx,
            y: dragState.startRect.y + dy,
          }
        : resizeRect(dragState.startRect, dragState.corner, dx, dy);

    const withAspect = applyAspectToRect(moved, aspect, display);
    setRect(clampCropRect(withAspect, display));
  }

  function handlePointerUp() {
    dragStateRef.current = null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex w-full justify-center">
        <div className="relative">
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imgRef}
              src={previewUrl}
              alt=""
              draggable={false}
              onLoad={handleImageLoad}
              className="block max-h-[50vh] max-w-full touch-none select-none sm:max-h-[60vh]"
            />
          )}

          {rect && display && (
            <div
              className="absolute inset-0 touch-none"
              onPointerDown={handleSurfacePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <div
                className="absolute inset-x-0 top-0 bg-background/70"
                style={{ height: rect.y }}
              />
              <div
                className="absolute inset-x-0 bottom-0 bg-background/70"
                style={{ height: display.height - rect.y - rect.height }}
              />
              <div
                className="absolute left-0 bg-background/70"
                style={{ top: rect.y, height: rect.height, width: rect.x }}
              />
              <div
                className="absolute right-0 bg-background/70"
                style={{
                  top: rect.y,
                  height: rect.height,
                  width: display.width - rect.x - rect.width,
                }}
              />

              <div
                className={cn(
                  "absolute cursor-move border-2 border-primary",
                  circular && "rounded-full",
                )}
                style={{
                  left: rect.x,
                  top: rect.y,
                  width: rect.width,
                  height: rect.height,
                }}
              >
                {CORNERS.map((corner) => (
                  <div
                    key={corner}
                    onPointerDown={handleHandlePointerDown(corner)}
                    className={cn(
                      "absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 touch-none rounded-full border-2 border-primary bg-background",
                      corner === "top-left" && "top-0 left-0",
                      corner === "top-right" && "top-0 left-full",
                      corner === "bottom-left" && "top-full left-0",
                      corner === "bottom-right" && "top-full left-full",
                      corner.startsWith("top")
                        ? "cursor-n-resize"
                        : "cursor-s-resize",
                    )}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={handleSelectAll}
        className="text-xs font-medium text-primary hover:underline"
      >
        Selecionar tudo
      </button>
    </div>
  );
}
