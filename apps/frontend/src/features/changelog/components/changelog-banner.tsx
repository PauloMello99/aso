"use client"

import * as React from "react"
import { Sparkles, X } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"
import { useChangelog, useMarkChangelogSeen } from "../hooks/use-changelog"
import { getUnseenEntries } from "../lib/unseen-entries"

interface ChangelogBannerProps {
  role: "owner" | "employee"
  permissions: readonly string[]
  className?: string
}

export function ChangelogBanner({
  role,
  permissions,
  className,
}: ChangelogBannerProps) {
  const { data, isLoading, isError } = useChangelog()
  const markSeen = useMarkChangelogSeen()
  const [dismissedUpTo, setDismissedUpTo] = React.useState(0)

  if (isLoading || isError || !data) return null

  const unseen = getUnseenEntries(
    data.entries,
    data.seenVersion,
    role,
    permissions,
  ).filter((entry) => entry.version > dismissedUpTo)
  if (unseen.length === 0) return null

  const latest = unseen.reduce((a, b) => (b.version > a.version ? b : a))
  const extra = unseen.length - 1
  const highlights = latest.highlights ?? []

  function handleDismiss() {
    setDismissedUpTo(latest.version)
    markSeen.mutate(latest.version, {
      onError: () => setDismissedUpTo(0),
    })
  }

  return (
    <Alert
      role="status"
      className={cn(
        "border-primary/20 bg-primary/5 text-foreground has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr_auto]",
        className,
      )}
    >
      <Sparkles className="text-primary" />
      <div className="col-start-2 flex min-w-0 flex-col gap-1 lg:flex-row lg:items-baseline lg:gap-3">
        <AlertTitle className="col-start-auto flex flex-wrap items-center gap-2">
          {latest.title}
          {extra > 0 ? (
            <Badge variant="secondary">
              +{extra} {extra === 1 ? "novidade" : "novidades"}
            </Badge>
          ) : null}
        </AlertTitle>
        <AlertDescription className="col-start-auto min-w-0 text-muted-foreground">
          <p>{latest.summary}</p>
          {highlights.length > 0 ? (
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {highlights.map((item, index) => (
                <li key={`${latest.id}-${index}`}>{item}</li>
              ))}
            </ul>
          ) : null}
        </AlertDescription>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="col-start-3 row-start-1 -mr-2 -mt-2 h-8 w-8 shrink-0"
        aria-label="Dispensar novidades"
        onClick={handleDismiss}
      >
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  )
}
