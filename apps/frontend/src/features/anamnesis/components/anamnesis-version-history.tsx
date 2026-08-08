"use client"

import { useMemo, useState } from "react"
import { Eye, Loader2 } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { AnamnesisVersionDetailSheet } from "./anamnesis-version-detail-sheet"
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
  const [detailVersion, setDetailVersion] = useState<AnamnesisFormVersion | null>(
    null,
  )

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
    <>
      <div className="grid gap-2 sm:hidden">
        {sorted.map((version) => (
          <button
            key={version.id}
            type="button"
            onClick={() => setDetailVersion(version)}
            className="flex items-center justify-between gap-3 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4 text-left"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  Versão {version.versionNumber}
                </span>
                {version.id === currentId && (
                  <Badge variant="success">Vigente</Badge>
                )}
              </div>
              <span className="text-xs text-foreground/40">
                criada em {fmtDate(version.createdAt)}
              </span>
            </div>
            <Eye className="h-4 w-4 shrink-0 text-foreground/30" />
          </button>
        ))}
      </div>

      <div className="hidden rounded-xl border border-foreground/[0.06] sm:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Versão</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criada em</TableHead>
              <TableHead className="pr-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((version) => (
              <TableRow
                key={version.id}
                onClick={() => setDetailVersion(version)}
                className="cursor-pointer"
              >
                <TableCell className="pl-4 font-medium text-foreground">
                  Versão {version.versionNumber}
                </TableCell>
                <TableCell>
                  {version.id === currentId ? (
                    <Badge variant="success">Vigente</Badge>
                  ) : (
                    <span className="text-foreground/30">—</span>
                  )}
                </TableCell>
                <TableCell className="text-foreground/40">
                  {fmtDate(version.createdAt)}
                </TableCell>
                <TableCell className="pr-4">
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDetailVersion(version)
                      }}
                    >
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">Ver perguntas</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AnamnesisVersionDetailSheet
        version={detailVersion}
        open={!!detailVersion}
        onOpenChange={(open) => {
          if (!open) setDetailVersion(null)
        }}
        isCurrent={detailVersion?.id === currentId}
      />
    </>
  )
}
