"use client"

import { useState } from "react"
import { AlertTriangle, Loader2, Plus, Trash2 } from "lucide-react"
import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog"
import { Switch } from "@/shared/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { Tooltip } from "@/shared/components/ui/tooltip"
import { useCampaigns } from "../hooks/use-campaigns"
import { campaignErrorMessage } from "../lib/error-messages"
import { CampaignSheet } from "./campaign-sheet"
import type { Campaign } from "../schemas/campaign.schema"
import type { CampaignTrigger } from "../types"

const TRIGGER_LABELS: Record<CampaignTrigger, string> = {
  post_service: "Pós-atendimento",
  birthday: "Aniversário",
  inactivity: "Inatividade",
}

type SheetState =
  | { mode: "create" }
  | { mode: "edit"; campaign: Campaign }
  | null

interface CampaignsListPageProps {
  orgId: string
}

export function CampaignsListPage({ orgId }: CampaignsListPageProps) {
  const {
    campaigns,
    campaignsEnabled,
    availableTriggers,
    defaults,
    loading,
    error,
    createCampaign,
    updateCampaign,
    deleteCampaign,
  } = useCampaigns(orgId)

  const [sheetState, setSheetState] = useState<SheetState>(null)
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [pendingToggleId, setPendingToggleId] = useState<string | null>(null)
  const [toggleError, setToggleError] = useState<string | null>(null)

  const canCreate = availableTriggers.length > 0

  function openCreate() {
    setSheetState({ mode: "create" })
  }

  function openEdit(campaign: Campaign) {
    setSheetState({ mode: "edit", campaign })
  }

  function openDelete(campaign: Campaign) {
    setDeleteError(null)
    setDeleteTarget(campaign)
  }

  async function handleToggle(campaign: Campaign, next: boolean) {
    setPendingToggleId(campaign.id)
    setToggleError(null)
    try {
      await updateCampaign(campaign.id, { enabled: next })
    } catch (err) {
      setToggleError(campaignErrorMessage(err))
    } finally {
      setPendingToggleId(null)
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    setDeleteError(null)
    try {
      await deleteCampaign(deleteTarget.id)
      setDeleteTarget(null)
    } catch (err) {
      setDeleteError(campaignErrorMessage(err))
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Campanhas</h1>
          <p className="text-sm text-muted-foreground">
            Um e-mail automático por gatilho. O ASO é a ponte; o texto é da sua
            organização.
          </p>
        </div>
        <Tooltip
          content="Você já tem uma campanha para cada gatilho disponível."
          side="bottom"
          disabled={canCreate}
        >
          <span className="inline-flex">
            <Button
              onClick={openCreate}
              disabled={!canCreate}
              className="shrink-0"
            >
              <Plus className="h-4 w-4" />
              Nova campanha
            </Button>
          </span>
        </Tooltip>
      </div>

      {!loading && !campaignsEnabled && (
        <Alert variant="warning">
          <AlertTriangle />
          <AlertDescription>
            As campanhas ainda não estão ativas para envio. Você pode
            configurá-las agora; elas começam a enviar quando ativarmos o
            recurso.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {toggleError && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive"
        >
          {toggleError}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-foreground/30">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Carregando campanhas…
        </div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-xl border border-dashed border-foreground/[0.08] py-16 text-center">
          <p className="text-sm text-foreground/40">Nenhuma campanha ainda.</p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-2 text-sm font-medium text-primary-text hover:underline"
          >
            Criar a primeira campanha
          </button>
        </div>
      ) : (
        <>
          <div className="divide-y divide-foreground/[0.06] rounded-xl border border-foreground/[0.06] sm:hidden">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="flex flex-col gap-2 p-4">
                <p className="font-medium text-foreground">{campaign.name}</p>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {TRIGGER_LABELS[campaign.trigger]}
                    </Badge>
                    {campaign.trigger === "inactivity" &&
                    campaign.inactivityMonths ? (
                      <span className="text-xs text-muted-foreground">
                        · {campaign.inactivityMonths} meses
                      </span>
                    ) : null}
                  </div>
                  <Switch
                    checked={campaign.enabled}
                    onCheckedChange={(v) => void handleToggle(campaign, v)}
                    disabled={pendingToggleId === campaign.id}
                    aria-label={
                      campaign.enabled
                        ? "Desativar campanha"
                        : "Ativar campanha"
                    }
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(campaign)}
                    className="flex-1"
                  >
                    Gerenciar
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                    onClick={() => openDelete(campaign)}
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden rounded-xl border border-foreground/[0.06] sm:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Nome</TableHead>
                  <TableHead>Gatilho</TableHead>
                  <TableHead>Ativa</TableHead>
                  <TableHead className="pr-4 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="pl-4 font-medium text-foreground">
                      {campaign.name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {TRIGGER_LABELS[campaign.trigger]}
                        </Badge>
                        {campaign.trigger === "inactivity" &&
                        campaign.inactivityMonths ? (
                          <span className="text-xs text-muted-foreground">
                            · {campaign.inactivityMonths} meses
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={campaign.enabled}
                        onCheckedChange={(v) => void handleToggle(campaign, v)}
                        disabled={pendingToggleId === campaign.id}
                        aria-label={
                          campaign.enabled
                            ? "Desativar campanha"
                            : "Ativar campanha"
                        }
                      />
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(campaign)}
                        >
                          Gerenciar
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => openDelete(campaign)}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {defaults && (
        <CampaignSheet
          open={sheetState !== null}
          onOpenChange={(o) => {
            if (!o) setSheetState(null)
          }}
          orgId={orgId}
          campaign={sheetState?.mode === "edit" ? sheetState.campaign : null}
          availableTriggers={availableTriggers}
          defaults={defaults}
          onCreate={createCampaign}
          onUpdate={updateCampaign}
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) {
            setDeleteTarget(null)
            setDeleteError(null)
          }
        }}
        title="Excluir campanha"
        description={
          deleteTarget
            ? `A campanha "${deleteTarget.name}" será removida. Quem já recebeu o e-mail deste gatilho não receberá de novo, mesmo se você criar outra campanha para o mesmo gatilho depois.`
            : undefined
        }
        confirmLabel="Excluir"
        destructive
        loading={deleteLoading}
        error={deleteError}
        onConfirm={() => void handleConfirmDelete()}
      />
    </div>
  )
}
