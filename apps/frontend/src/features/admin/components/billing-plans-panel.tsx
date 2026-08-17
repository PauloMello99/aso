"use client"

import * as React from "react"
import { ChevronDown, ChevronRight, Loader2, PackageOpen, Plus } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"
import { Label } from "@/shared/components/ui/label"
import { Switch } from "@/shared/components/ui/switch"
import { CurrencyInput } from "@/shared/components/ui/currency-input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
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
import { formatBRL } from "@/features/cashier/lib/money"
import type {
  BillingInterval,
  BillingPlan,
  BillingPlanPrice,
  MigrateSubscribersResult,
  RotatePlanIntervalPriceResult,
  UpdateBillingPlanProductInput,
  UpsertPlanIntervalPriceInput,
} from "@/features/billing/types"
import {
  useAdminBillingPlans,
  useCreatePlanIntervalPrice,
  useRotatePlanIntervalPrice,
  useSetPlanIntervalActive,
  useUpdateBillingPlanProduct,
} from "../hooks/use-admin-billing-plans"
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog"

const INTERVAL_LABELS: Record<BillingInterval, string> = {
  monthly: "Mensal",
  semiannual: "Semestral",
  annual: "Anual",
}

const ALL_INTERVALS: BillingInterval[] = ["monthly", "semiannual", "annual"]

const MIGRATION_STATUS_LABELS: Record<MigrateSubscribersResult["status"], string> = {
  migrated: "Migrado",
  skipped_already_migrated: "Já migrado",
  failed: "Falhou",
}

const MIGRATION_STATUS_CLASSES: Record<MigrateSubscribersResult["status"], string> = {
  migrated: "bg-success/15 text-success",
  skipped_already_migrated: "bg-foreground/10 text-foreground/50",
  failed: "bg-destructive/15 text-destructive",
}

interface RotateTarget {
  plan: BillingPlan
  price: BillingPlanPrice
}

interface DisableTarget {
  plan: BillingPlan
  price: BillingPlanPrice
}

export function BillingPlansPanel() {
  const { plans, loading, error } = useAdminBillingPlans()

  const [editingPlan, setEditingPlan] = React.useState<BillingPlan | null>(null)
  const [addingIntervalPlan, setAddingIntervalPlan] = React.useState<BillingPlan | null>(
    null,
  )
  const [rotateTarget, setRotateTarget] = React.useState<RotateTarget | null>(null)
  const [disableTarget, setDisableTarget] = React.useState<DisableTarget | null>(null)
  const [expandedPlanIds, setExpandedPlanIds] = React.useState<Set<string>>(new Set())
  const [activatingKey, setActivatingKey] = React.useState<string | null>(null)

  const { setActive, isPending: settingActive, error: setActiveError } =
    useSetPlanIntervalActive()

  function toggleExpanded(planId: string) {
    setExpandedPlanIds((prev) => {
      const next = new Set(prev)
      if (next.has(planId)) {
        next.delete(planId)
      } else {
        next.add(planId)
      }
      return next
    })
  }

  async function handleEnable(plan: BillingPlan, price: BillingPlanPrice) {
    const key = `${plan.key}:${price.interval}`
    setActivatingKey(key)
    try {
      await setActive({ key: plan.key, interval: price.interval, active: true })
    } finally {
      setActivatingKey(null)
    }
  }

  return (
    <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground">Catálogo de planos</h2>
        <span className="text-xs text-foreground/40">
          Sincronização automática (boot + reconciliação a cada 3 dias)
        </span>
      </div>

      {setActiveError && disableTarget === null && (
        <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {setActiveError}
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
          </div>
        )}

        {!loading && !error && plans.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-foreground/[0.06]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-normal">Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => {
                  const expanded = expandedPlanIds.has(plan.id)
                  const canAddInterval = plan.prices.length < 3

                  return (
                    <React.Fragment key={plan.id}>
                      <TableRow>
                        <TableCell className="whitespace-normal font-medium text-foreground">
                          <button
                            type="button"
                            onClick={() => toggleExpanded(plan.id)}
                            className="flex items-center gap-1.5 text-left"
                          >
                            {expanded ? (
                              <ChevronDown className="h-4 w-4 shrink-0 text-foreground/40" />
                            ) : (
                              <ChevronRight className="h-4 w-4 shrink-0 text-foreground/40" />
                            )}
                            <span>{plan.name}</span>
                            <span className="hidden text-xs font-normal text-foreground/40 sm:inline">
                              ({plan.prices.length}{" "}
                              {plan.prices.length === 1 ? "preço" : "preços"})
                            </span>
                          </button>
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
                        <TableCell>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingPlan(plan)}
                          >
                            Editar produto
                          </Button>
                        </TableCell>
                      </TableRow>

                      {expanded && (
                        <TableRow>
                          <TableCell colSpan={3} className="whitespace-normal bg-foreground/[0.015]">
                            <div className="space-y-2 py-1">
                              {plan.prices.length === 0 && (
                                <p className="text-sm text-foreground/40">
                                  Nenhum intervalo de preço cadastrado.
                                </p>
                              )}

                              {plan.prices.map((price) => {
                                const isActivating =
                                  activatingKey === `${plan.key}:${price.interval}` &&
                                  settingActive

                                return (
                                  <div
                                    key={price.id}
                                    className="flex flex-col gap-2 rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] p-3 sm:flex-row sm:items-center sm:justify-between"
                                  >
                                    <div className="flex flex-wrap items-center gap-3">
                                      <span className="text-sm font-medium text-foreground">
                                        {INTERVAL_LABELS[price.interval]}
                                      </span>
                                      <span className="text-sm tabular-nums text-foreground/70">
                                        {formatBRL(price.amountCents)}
                                      </span>
                                      {price.active ? (
                                        <Badge className="bg-success/15 text-success">
                                          Ativo
                                        </Badge>
                                      ) : (
                                        <Badge className="bg-foreground/10 text-foreground/50">
                                          Inativo
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {price.active && (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          disabled={settingActive}
                                          onClick={() => setRotateTarget({ plan, price })}
                                        >
                                          Rotacionar preço
                                        </Button>
                                      )}
                                      {price.active ? (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          disabled={settingActive}
                                          onClick={() => setDisableTarget({ plan, price })}
                                        >
                                          Desabilitar
                                        </Button>
                                      ) : (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          disabled={settingActive}
                                          onClick={() => void handleEnable(plan, price)}
                                        >
                                          {isActivating && (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          )}
                                          Habilitar
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}

                              {canAddInterval && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setAddingIntervalPlan(plan)}
                                >
                                  <Plus className="h-4 w-4" />
                                  Adicionar intervalo
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <EditProductDialog plan={editingPlan} onClose={() => setEditingPlan(null)} />
      <AddIntervalDialog
        plan={addingIntervalPlan}
        onClose={() => setAddingIntervalPlan(null)}
      />
      <RotatePriceFlow target={rotateTarget} onClose={() => setRotateTarget(null)} />

      <ConfirmDialog
        open={disableTarget !== null}
        onOpenChange={(o) => !o && !settingActive && setDisableTarget(null)}
        title="Desabilitar intervalo"
        description={
          disableTarget
            ? `Desabilitar o intervalo "${INTERVAL_LABELS[disableTarget.price.interval]}" do plano "${disableTarget.plan.name}"? O intervalo some do checkout e da vitrine pública; assinantes existentes não são afetados.`
            : undefined
        }
        confirmLabel="Desabilitar"
        destructive
        loading={settingActive}
        error={setActiveError}
        onConfirm={() => {
          if (!disableTarget) return
          void setActive({
            key: disableTarget.plan.key,
            interval: disableTarget.price.interval,
            active: false,
          }).then(() => setDisableTarget(null))
        }}
      />
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

function AddIntervalDialog({
  plan,
  onClose,
}: {
  plan: BillingPlan | null
  onClose: () => void
}) {
  const { createPrice, isPending, error } = useCreatePlanIntervalPrice()

  const missingIntervals = plan
    ? ALL_INTERVALS.filter((i) => !plan.prices.some((p) => p.interval === i))
    : []

  const [selectedInterval, setSelectedInterval] = React.useState<BillingInterval | "">(
    "",
  )
  const [amountCents, setAmountCents] = React.useState<number | null>(null)

  React.useEffect(() => {
    if (plan) {
      const missing = ALL_INTERVALS.filter(
        (i) => !plan.prices.some((p) => p.interval === i),
      )
      setSelectedInterval(missing[0] ?? "")
      setAmountCents(null)
    }
  }, [plan])

  const open = plan !== null

  const canSubmit =
    plan !== null &&
    selectedInterval !== "" &&
    amountCents !== null &&
    Number.isInteger(amountCents) &&
    amountCents > 0

  async function handleCreate() {
    if (!plan || selectedInterval === "" || amountCents === null) return

    const input: UpsertPlanIntervalPriceInput = {
      interval: selectedInterval,
      amountCents,
      currency: "brl",
    }
    await createPrice({ key: plan.key, input })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !isPending && !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Adicionar intervalo</DialogTitle>
          <DialogDescription>
            Cria um novo preço para o plano{plan ? ` "${plan.name}"` : ""}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-interval">Intervalo</Label>
            <Select
              value={selectedInterval}
              onValueChange={(v) => setSelectedInterval(v as BillingInterval)}
            >
              <SelectTrigger id="new-interval">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {missingIntervals.map((i) => (
                  <SelectItem key={i} value={i}>
                    {INTERVAL_LABELS[i]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-interval-amount">Valor (R$)</Label>
            <CurrencyInput
              id="new-interval-amount"
              value={amountCents}
              onValueChange={setAmountCents}
            />
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
            onClick={() => void handleCreate()}
            disabled={isPending || !canSubmit}
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RotatePriceFlow({
  target,
  onClose,
}: {
  target: RotateTarget | null
  onClose: () => void
}) {
  const { rotatePrice, isPending, error } = useRotatePlanIntervalPrice()

  const [amountCents, setAmountCents] = React.useState<number | null>(null)
  const [validationError, setValidationError] = React.useState<string | null>(null)
  const [confirming, setConfirming] = React.useState(false)
  const [result, setResult] = React.useState<RotatePlanIntervalPriceResult | null>(null)

  React.useEffect(() => {
    if (target) {
      setAmountCents(target.price.amountCents)
      setValidationError(null)
      setConfirming(false)
      setResult(null)
    }
  }, [target])

  const formOpen = target !== null && !confirming && result === null
  const confirmOpen = target !== null && confirming && result === null
  const resultOpen = target !== null && result !== null

  function handleContinue() {
    if (amountCents === null || !Number.isInteger(amountCents) || amountCents <= 0) {
      setValidationError("Informe um valor válido maior que zero.")
      return
    }
    setValidationError(null)
    setConfirming(true)
  }

  async function handleConfirm() {
    if (!target || amountCents === null) return
    const res = await rotatePrice({
      key: target.plan.key,
      interval: target.price.interval,
      input: { amountCents },
    })
    setResult(res)
  }

  function handleClose() {
    setConfirming(false)
    setResult(null)
    onClose()
  }

  const failedCount =
    result?.migration.results.filter((r) => r.status === "failed").length ?? 0
  const migratedCount =
    result?.migration.results.filter((r) => r.status === "migrated").length ?? 0
  const skippedCount =
    result?.migration.results.filter((r) => r.status === "skipped_already_migrated")
      .length ?? 0

  return (
    <>
      <Dialog open={formOpen} onOpenChange={(o) => !o && handleClose()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rotacionar preço</DialogTitle>
            <DialogDescription>
              Define o novo valor do intervalo
              {target
                ? ` "${INTERVAL_LABELS[target.price.interval]}" do plano "${target.plan.name}"`
                : ""}
              .
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="rotate-amount">Novo valor (R$)</Label>
            <CurrencyInput
              id="rotate-amount"
              value={amountCents}
              onValueChange={(v) => {
                setAmountCents(v)
                setValidationError(null)
              }}
            />
            {validationError && (
              <p className="text-sm text-destructive">{validationError}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleContinue}>
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(o) => !o && !isPending && setConfirming(false)}
        title="Confirmar rotação de preço"
        description={
          target && amountCents !== null ? (
            <>
              Você está prestes a alterar o preço do plano &quot;{target.plan.name}&quot; (
              {INTERVAL_LABELS[target.price.interval]}) para {formatBRL(amountCents)}.
              Isso cria um novo preço no Stripe e arquiva o atual.{" "}
              <strong>
                Todos os assinantes ativos e em trial nesse intervalo serão migrados
                automaticamente para o novo valor, com cobrança ou crédito proporcional
                ao período já pago (rateio).
              </strong>{" "}
              Assinantes com fatura em atraso não são migrados agora. Esta ação não pode
              ser desfeita.
            </>
          ) : undefined
        }
        confirmLabel="Rotacionar preço"
        destructive
        loading={isPending}
        error={error}
        onConfirm={() => void handleConfirm()}
      />

      <Dialog open={resultOpen} onOpenChange={(o) => !o && handleClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resultado da rotação</DialogTitle>
            <DialogDescription>
              {migratedCount} migrado(s), {skippedCount} já migrado(s), {failedCount}{" "}
              falhou(aram).
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-64 space-y-2 overflow-y-auto">
            {result?.migration.results.map((r) => (
              <div
                key={r.stripeSubscriptionId}
                className="flex flex-col gap-1 rounded-lg border border-foreground/[0.06] p-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm text-foreground/70">org: {r.orgId}</span>
                  <Badge className={MIGRATION_STATUS_CLASSES[r.status]}>
                    {MIGRATION_STATUS_LABELS[r.status]}
                  </Badge>
                </div>
                {r.status === "failed" && r.error && (
                  <p className="text-sm text-destructive">{r.error}</p>
                )}
              </div>
            ))}
            {result?.migration.results.length === 0 && (
              <p className="text-sm text-foreground/40">
                Nenhum assinante ativo/trial nesse intervalo para migrar.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" onClick={handleClose}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
