"use client"

import * as React from "react"
import { RefreshCw, Loader2, PackageOpen } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"
import { Label } from "@/shared/components/ui/label"
import { Switch } from "@/shared/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { formatBRL, centsToReaisInput, parseReaisToCents } from "@/features/cashier/lib/money"
import type {
  BillingInterval,
  BillingPlan,
  PlanSyncStatus,
  UpdateBillingPlanProductInput,
} from "@/features/billing/types"
import {
  useAdminBillingPlans,
  useRotateBillingPlanPrice,
  useSyncPlanCatalog,
  useUpdateBillingPlanProduct,
} from "../hooks/use-admin-billing-plans"
import { fmtDate } from "../lib/format"
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog"

const INTERVAL_LABELS: Record<BillingInterval, string> = {
  monthly: "Mensal",
  semiannual: "Semestral",
  annual: "Anual",
}

const SYNC_STATUS_LABELS: Record<PlanSyncStatus, string> = {
  created: "Criado",
  unchanged: "Sem alteração",
  drift: "Divergência detectada",
  failed: "Falhou",
}

const SYNC_STATUS_CLASSES: Record<PlanSyncStatus, string> = {
  created: "bg-success/15 text-success",
  unchanged: "bg-foreground/10 text-foreground/50",
  drift: "bg-primary/15 text-primary",
  failed: "bg-destructive/15 text-destructive",
}

export function BillingPlansPanel() {
  const { plans, loading, error } = useAdminBillingPlans()
  const { syncCatalog, report, isPending: syncing, error: syncError } =
    useSyncPlanCatalog()

  const [editingPlan, setEditingPlan] = React.useState<BillingPlan | null>(null)
  const [rotatingPlan, setRotatingPlan] = React.useState<BillingPlan | null>(null)

  return (
    <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground">Catálogo de planos</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={syncing}
          onClick={() => void syncCatalog()}
        >
          {syncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Sincronizar com Stripe
        </Button>
      </div>

      {syncError && (
        <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {syncError}
        </div>
      )}

      {report && (
        <div className="mt-4 space-y-2">
          {report.results.map((result) => (
            <div key={result.key} className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-foreground/[0.06] px-3 py-2">
                <span className="text-sm font-medium text-foreground">{result.key}</span>
                <Badge className={SYNC_STATUS_CLASSES[result.status]}>
                  {SYNC_STATUS_LABELS[result.status]}
                </Badge>
              </div>
              {result.status === "failed" && result.error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                  {result.error}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-6">
        {loading && (
          <div className="space-y-px">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-md bg-foreground/[0.02]" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && plans.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-foreground/40">
            <PackageOpen className="h-8 w-8" />
            <p className="text-sm">Nenhum plano no catálogo ainda.</p>
            <p className="text-xs">
              Clique em &quot;Sincronizar com Stripe&quot; para importar os planos.
            </p>
          </div>
        )}

        {!loading && !error && plans.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-foreground/[0.06]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead>Intervalo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Último sync</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium text-foreground">
                      {plan.name}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBRL(plan.amountCents)}
                    </TableCell>
                    <TableCell className="text-foreground/70">
                      {INTERVAL_LABELS[plan.interval]}
                    </TableCell>
                    <TableCell>
                      {plan.active ? (
                        <Badge className="bg-success/15 text-success">Ativo</Badge>
                      ) : (
                        <Badge className="bg-foreground/10 text-foreground/50">
                          Inativo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-foreground/50 sm:table-cell">
                      {plan.lastSyncedAt ? fmtDate(plan.lastSyncedAt) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingPlan(plan)}
                        >
                          Editar produto
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setRotatingPlan(plan)}
                        >
                          Rotacionar preço
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <EditProductDialog plan={editingPlan} onClose={() => setEditingPlan(null)} />
      <RotatePriceFlow plan={rotatingPlan} onClose={() => setRotatingPlan(null)} />
    </div>
  )
}

function EditProductDialog({
  plan,
  onClose,
}: {
  plan: BillingPlan | null
  onClose: () => void
}) {
  const { updateProduct, isPending, error } = useUpdateBillingPlanProduct()

  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [active, setActive] = React.useState(true)

  React.useEffect(() => {
    if (plan) {
      setName(plan.name)
      setDescription(plan.description ?? "")
      setActive(plan.active)
    }
  }, [plan])

  const open = plan !== null

  const hasChanges =
    plan !== null &&
    (name.trim() !== plan.name ||
      description.trim() !== (plan.description ?? "") ||
      active !== plan.active)

  const nameValid = name.trim().length > 0

  async function handleSave() {
    if (!plan || !hasChanges || !nameValid) return

    const input: UpdateBillingPlanProductInput = {}
    if (name.trim() !== plan.name) input.name = name.trim()
    if (description.trim() !== (plan.description ?? "")) {
      input.description = description.trim()
    }
    if (active !== plan.active) input.active = active

    await updateProduct({ key: plan.key, input })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !isPending && !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar produto</DialogTitle>
          <DialogDescription>
            Atualiza os dados do produto associado a este plano no Stripe.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="plan-name">Nome</Label>
            <Input
              id="plan-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plan-description">Descrição</Label>
            <Textarea
              id="plan-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opcional"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="plan-active">Ativo</Label>
            <Switch id="plan-active" checked={active} onCheckedChange={setActive} />
          </div>

          {error && (
            <p className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={isPending || !hasChanges || !nameValid}
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RotatePriceFlow({
  plan,
  onClose,
}: {
  plan: BillingPlan | null
  onClose: () => void
}) {
  const { rotatePrice, isPending, error } = useRotateBillingPlanPrice()

  const [amountInput, setAmountInput] = React.useState("")
  const [validationError, setValidationError] = React.useState<string | null>(null)
  const [confirming, setConfirming] = React.useState(false)
  const [newAmountCents, setNewAmountCents] = React.useState<number | null>(null)

  React.useEffect(() => {
    if (plan) {
      setAmountInput(centsToReaisInput(plan.amountCents))
      setValidationError(null)
      setConfirming(false)
      setNewAmountCents(null)
    }
  }, [plan])

  const open = plan !== null && !confirming

  const parsedAmountCents = parseReaisToCents(amountInput)
  const sameAsCurrent =
    plan !== null &&
    !Number.isNaN(parsedAmountCents) &&
    parsedAmountCents === plan.amountCents

  function handleContinue() {
    const cents = parseReaisToCents(amountInput)
    if (Number.isNaN(cents) || cents <= 0) {
      setValidationError("Informe um valor válido maior que zero.")
      return
    }
    if (plan && cents === plan.amountCents) {
      setValidationError("O valor é igual ao atual — nada para rotacionar.")
      return
    }
    setValidationError(null)
    setNewAmountCents(cents)
    setConfirming(true)
  }

  async function handleConfirm() {
    if (!plan || newAmountCents === null) return
    await rotatePrice({ key: plan.key, input: { amountCents: newAmountCents } })
    setConfirming(false)
    onClose()
  }

  function handleClose() {
    setConfirming(false)
    onClose()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rotacionar preço</DialogTitle>
            <DialogDescription>
              Define o novo valor do plano{plan ? ` "${plan.name}"` : ""}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="rotate-amount">Novo valor (R$)</Label>
            <Input
              id="rotate-amount"
              value={amountInput}
              onChange={(e) => {
                setAmountInput(e.target.value)
                setValidationError(null)
              }}
              placeholder="0,00"
            />
            {validationError && (
              <p className="text-sm text-destructive">{validationError}</p>
            )}
            {!validationError && sameAsCurrent && (
              <p className="text-sm text-foreground/50">
                O valor é igual ao atual — nada para rotacionar.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleContinue} disabled={sameAsCurrent}>
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirming && plan !== null && newAmountCents !== null}
        onOpenChange={(o) => !o && !isPending && setConfirming(false)}
        title="Confirmar rotação de preço"
        description={
          plan && newAmountCents !== null
            ? `Você está prestes a alterar o preço do plano "${plan.name}" para ${formatBRL(
                newAmountCents,
              )}. Isso cria um novo preço no Stripe e arquiva o atual — essa ação não pode ser desfeita. Assinantes que já estão ativos NÃO são migrados automaticamente; continuam pagando o valor anterior.`
            : undefined
        }
        confirmLabel="Rotacionar preço"
        destructive
        loading={isPending}
        error={error}
        onConfirm={() => void handleConfirm()}
      />
    </>
  )
}
