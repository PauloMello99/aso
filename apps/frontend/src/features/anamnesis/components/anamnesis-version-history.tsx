"use client"

import { useMemo, useState } from "react"
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { cn } from "@/shared/lib/utils"
import type { AnamnesisFormVersion } from "../types"

interface AnamnesisVersionHistoryProps {
  versions: AnamnesisFormVersion[]
  versionsLoading: boolean
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function AnamnesisVersionHistory({
  versions,
  versionsLoading,
}: AnamnesisVersionHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const sorted = useMemo(
    () => [...versions].sort((a, b) => b.versionNumber - a.versionNumber),
    [versions],
  )
  const currentId = sorted[0]?.id

  if (versionsLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-foreground/30">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Carregando histórico…
      </div>
    )
  }

  if (sorted.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-foreground/[0.08] p-4 text-sm text-foreground/30">
        Nenhuma versão salva ainda.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {sorted.map((version) => {
          const expanded = expandedId === version.id
          return (
            <li
              key={version.id}
              className="rounded-lg border border-foreground/[0.06] bg-foreground/[0.02]"
            >
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : version.id)}
                className="flex w-full items-center justify-between gap-3 p-3 text-left sm:p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    Versão {version.versionNumber}
                  </span>
                  {version.id === currentId && (
                    <Badge variant="success">Vigente</Badge>
                  )}
                  <span className="text-xs text-foreground/40">
                    criada em {fmtDate(version.createdAt)}
                  </span>
                </div>
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 shrink-0 items-center justify-center text-foreground/40"
                >
                  {expanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </span>
              </button>

              {expanded && (
                <ul
                  className={cn(
                    "flex flex-col gap-2 border-t border-foreground/[0.06] p-3 sm:p-4",
                  )}
                >
                  {version.questions.map((question) => (
                    <li
                      key={question.id}
                      className="rounded-md border border-foreground/[0.06] bg-foreground/[0.02] px-3 py-2 text-sm"
                    >
                      <span className="text-foreground">{question.label}</span>
                      <span className="ml-2 text-xs text-foreground/30">
                        {question.type === "text" ? "Texto livre" : "Sim / Não"}
                        {question.required ? " · obrigatória" : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
