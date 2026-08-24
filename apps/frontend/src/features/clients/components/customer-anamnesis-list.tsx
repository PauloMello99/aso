"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
  ANAMNESIS_RESPONSE_STATUS_LABELS,
  sendAnamnesisInviteErrorMessage,
  useSendAnamnesisInvite,
  type AnamnesisResponseListItem,
} from "@/features/anamnesis"

interface CustomerAnamnesisListProps {
  orgId: string
  customerId: string
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

interface CustomerAnamnesisRowProps {
  orgId: string
  customerId: string
  response: AnamnesisResponseListItem
  onSelect: (response: AnamnesisResponseListItem) => void
}

function CustomerAnamnesisRow({
  orgId,
  customerId,
  response,
  onSelect,
}: CustomerAnamnesisRowProps) {
  const { mutateAsync: sendInvite, isPending: sending } =
    useSendAnamnesisInvite(orgId)
  const [error, setError] = useState<string | null>(null)
  const [resendResult, setResendResult] = useState<"resent" | "new" | null>(
    null,
  )

  async function handleResend(event: React.MouseEvent) {
    event.stopPropagation()
    if (!response.serviceTypeId) return
    setError(null)
    setResendResult(null)
    try {
      const result = await sendInvite({
        customerId,
        serviceTypeId: response.serviceTypeId,
      })
      setResendResult(result.resent ? "resent" : "new")
    } catch (err) {
      setError(sendAnamnesisInviteErrorMessage(err))
    }
  }

  return (
    <div
      onClick={() => onSelect(response)}
      className="flex cursor-pointer flex-col gap-3 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4 sm:flex-row sm:items-start sm:justify-between"
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
          Versão {response.versionNumber ?? "—"} · {fmtDate(response.submittedAt)}
        </div>
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        {resendResult === "resent" && (
          <p className="mt-1 text-xs text-success">Ficha reenviada.</p>
        )}
        {resendResult === "new" && (
          <p className="mt-1 text-xs text-success">Nova ficha enviada.</p>
        )}
      </div>

      {response.status !== "submitted" && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          disabled={!response.serviceTypeId || sending}
          onClick={(event) => void handleResend(event)}
        >
          {sending && <Loader2 className="h-4 w-4 animate-spin" />}
          Reenviar
        </Button>
      )}
    </div>
  )
}

export function CustomerAnamnesisList({
  orgId,
  customerId,
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
        <CustomerAnamnesisRow
          key={response.id}
          orgId={orgId}
          customerId={customerId}
          response={response}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}
