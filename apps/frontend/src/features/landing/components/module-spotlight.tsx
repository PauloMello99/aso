import * as React from "react"
import Image from "next/image"
import { Check } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { cn } from "@/shared/lib/utils"

interface ModuleSpotlightProps {
  eyebrow: string
  title: string
  bullets: string[]
  imageSrc: string
  imageAlt: string
  imageWidth: number
  imageHeight: number
  reverse?: boolean
  layout?: "split" | "stacked"
}

export function ModuleSpotlight({
  eyebrow,
  title,
  bullets,
  imageSrc,
  imageAlt,
  imageWidth,
  imageHeight,
  reverse = false,
  layout = "split",
}: ModuleSpotlightProps) {
  const isPortrait = imageHeight > imageWidth

  if (layout === "stacked") {
    return (
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <div className="mb-4 flex justify-center">
            <Badge
              variant="outline"
              className="border-foreground/10 font-semibold text-foreground/60"
            >
              {eyebrow}
            </Badge>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h2>
          <ul className="mx-auto mt-6 grid max-w-3xl grid-cols-1 gap-3 text-left sm:grid-cols-2">
            {bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Check className="h-3 w-3" />
                </span>
                <span className="text-foreground/70">{bullet}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mx-auto mt-12 max-w-5xl px-4 sm:px-6">
          <div
            className={cn(
              "overflow-hidden rounded-xl border border-foreground/10 shadow-2xl",
              isPortrait && "mx-auto max-w-md",
            )}
          >
            <Image
              src={imageSrc}
              alt={imageAlt}
              width={imageWidth}
              height={imageHeight}
              className="h-auto w-full"
            />
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className={cn(reverse && "lg:order-2")}>
            <div className="mb-4">
              <Badge
                variant="outline"
                className="border-foreground/10 font-semibold text-foreground/60"
              >
                {eyebrow}
              </Badge>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {title}
            </h2>
            <ul className="mt-6 space-y-4">
              {bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Check className="h-3 w-3" />
                  </span>
                  <span className="text-foreground/70">{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={cn(reverse && "lg:order-1")}>
            <div
              className={cn(
                "overflow-hidden rounded-xl border border-foreground/10 shadow-2xl",
                isPortrait && "mx-auto max-w-md",
              )}
            >
              <Image
                src={imageSrc}
                alt={imageAlt}
                width={imageWidth}
                height={imageHeight}
                className="h-auto w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
