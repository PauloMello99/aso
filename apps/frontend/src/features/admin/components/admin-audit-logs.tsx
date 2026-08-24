"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, Shield } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { Input } from "@/shared/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { useAdminAuditLogs } from "../hooks/use-admin"
import type { AuditAction, AuditLogFilters } from "../types"

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const ACTION_LABELS: Record<AuditAction, string> = {
  create: "Criação",
  update: "Atualização",
  delete: "Remoção",
  invite_sent: "Convite enviado",
  invite_accepted: "Convite aceito",
  subscription_changed: "Assinatura",
}

const ACTION_VARIANTS: Record<
  AuditAction,
  "default" | "secondary" | "destructive" | "outline"
> = {
  create: "default",
  update: "secondary",
  delete: "destructive",
  invite_sent: "outline",
  invite_accepted: "outline",
  subscription_changed: "secondary",
}

const ACTION_OPTIONS: AuditAction[] = [
  "create",
  "update",
  "delete",
  "invite_sent",
  "invite_accepted",
  "subscription_changed",
]

const PAGE_SIZE = 50

export function AdminAuditLogs() {
  const [filters, setFilters] = React.useState<AuditLogFilters>({
    page: 1,
    limit: PAGE_SIZE,
  })
  const [entityType, setEntityType] = React.useState("")
  const [expandedId, setExpandedId] = React.useState<string | null>(null)

  const { page: result, loading, error } = useAdminAuditLogs(filters)

  const handleAction = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      page: 1,
      action: value === "all" ? undefined : (value as AuditAction),
    }))
  }

  const handleEntityType = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEntityType(e.target.value)
  }

  const applyEntityType = () => {
    setFilters((prev) => ({
      ...prev,
      page: 1,
      entityType: entityType.trim() || undefined,
    }))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") applyEntityType()
  }

  const goTo = (p: number) => setFilters((prev) => ({ ...prev, page: p }))

  const currentPage = result?.page ?? 1
  const totalPages = result?.pages ?? 1

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Auditoria</h1>
        <p className="mt-0.5 text-sm text-foreground/50">
          Log de ações críticas na plataforma: quem fez o quê e quando.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select onValueChange={handleAction} defaultValue="all">
          <SelectTrigger className="h-8 w-48 text-sm">
            <SelectValue placeholder="Todas as ações" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as ações</SelectItem>
            {ACTION_OPTIONS.map((a) => (
              <SelectItem key={a} value={a}>
                {ACTION_LABELS[a]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-1">
          <Input
            className="h-8 w-44 text-sm"
            placeholder="Tipo (ex: user, organization)"
            value={entityType}
            onChange={handleEntityType}
            onKeyDown={handleKeyDown}
          />
          <Button variant="outline" size="sm" className="h-8" onClick={applyEntityType}>
            Filtrar
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-foreground/40">
          Carregando...
        </div>
      ) : !result || result.data.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-foreground/40">
          <Shield className="h-8 w-8" />
          <p className="text-sm">Nenhum registro de auditoria encontrado.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-foreground/[0.06]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Data/Hora</TableHead>
                  <TableHead>Ator</TableHead>
                  <TableHead>Org</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead className="text-right">Metadados</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.data.map((row) => (
                  <React.Fragment key={row.id}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() =>
                        setExpandedId(expandedId === row.id ? null : row.id)
                      }
                    >
                      <TableCell className="whitespace-nowrap text-xs text-foreground/60">
                        {fmtDateTime(row.createdAt)}
                      </TableCell>
                      <TableCell>
                        {row.actor ? (
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {row.actor.name || "—"}
                            </p>
                            <p className="truncate text-xs text-foreground/50">
                              {row.actor.email}
                            </p>
                            {row.metadata?.viaSuperAdmin === true && (
                              <Badge
                                variant="outline"
                                className="mt-0.5 px-1.5 py-0 text-[10px]"
                              >
                                via super_admin
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-foreground/40">sistema</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.org ? (
                          <span className="text-sm">{row.org.name}</span>
                        ) : (
                          <span className="text-xs text-foreground/40">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={ACTION_VARIANTS[row.action]} className="text-xs">
                          {ACTION_LABELS[row.action]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="font-mono text-xs">{row.entityType}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        {row.metadata && Object.keys(row.metadata).length > 0 ? (
                          <span className="text-xs text-foreground/40 underline decoration-dotted">
                            {expandedId === row.id ? "fechar" : "ver"}
                          </span>
                        ) : (
                          <span className="text-xs text-foreground/20">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                    {expandedId === row.id && row.metadata && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="bg-foreground/[0.02] py-2 pl-4"
                        >
                          <pre className="overflow-x-auto whitespace-pre-wrap break-all text-xs text-foreground/70">
                            {JSON.stringify(row.metadata, null, 2)}
                          </pre>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-sm text-foreground/50">
            <span>
              {result.total} registro{result.total !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={currentPage <= 1}
                onClick={() => goTo(currentPage - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={currentPage >= totalPages}
                onClick={() => goTo(currentPage + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
