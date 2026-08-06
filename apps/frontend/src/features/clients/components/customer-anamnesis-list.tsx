"use client"

import { Badge } from "@/shared/components/ui/badge"
import {
  ANAMNESIS_RESPONSE_STATUS_LABELS,
  type AnamnesisResponseListItem,
} from "@/features/anamnesis"

interface CustomerAnamnesisListProps {
  responses: AnamnesisResponseListItem[]
  onSelect: (response: AnamnesisResponseListItem) => void
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function CustomerAnamnesisList({
  responses,
  onSelect,
}: CustomerAnamnesisListProps) {
  if (responses.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-foreground/[0.08] py-10 text-center">
        <p className="text-sm text-foreground/30">
          Nenhuma ficha de anamnese enviada para este cliente.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {responses.map((response) => (
        <div
          key={response.id}
          onClick={() => onSelect(response)}
          className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate font-medium text-foreground">
                {response.serviceTypeName ?? "—"}
              </span>
              <Badge
                variant={response.status === "submitted" ? "success" : "warning"}
              >
                {ANAMNESIS_RESPONSE_STATUS_LABELS[response.status]}
              </Badge>
            </div>
            <div className="mt-1 text-xs text-foreground/40">
              Versão {response.versionNumber ?? "—"} ·{" "}
              {fmtDate(response.submittedAt)}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
