"use client"

import * as React from "react"
import { Loader2, TicketPercent } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { DatePicker } from "@/shared/components/ui/date-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
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
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog"
import { cn } from "@/shared/lib/utils"
import { formatBRL } from "@/features/cashier/lib/money"
import type { BillingCoupon, CouponDuration } from "@/features/billing/types"
import {
  useAdminBillingCoupons,
  useCreateBillingCoupon,
  useToggleBillingCoupon,
} from "../hooks/use-admin-billing-coupons"
import {
  COUPON_CODE_ERROR_MESSAGES,
  EMPTY_COUPON_FORM,
  buildCouponSummary,
  buildCreateCouponInput,
  getCouponFormErrors,
  parsePositiveInteger,
  validateCouponCode,
  type CouponFormValues,
} from "../lib/billing-coupon-form"
import { fmtDate } from "../lib/format"

const DURATION_LABELS: Record<CouponDuration, string> = {
  once: "Única",
  repeating: "Recorrente",
  forever: "Permanente",
}

type ActiveFilter = "all" | "active" | "inactive"

function durationCell(coupon: BillingCoupon): string {
  if (coupon.duration === "repeating") {
    return `${coupon.durationInMonths ?? "—"} meses`
  }
  return DURATION_LABELS[coupon.duration]
}

function discountCell(coupon: BillingCoupon): string {
  if (coupon.percentOff !== null) return `${coupon.percentOff}%`
  return coupon.amountOffCents !== null ? formatBRL(coupon.amountOffCents) : "—"
}

export function BillingCouponsPanel() {
  const [filter, setFilter] = React.useState<ActiveFilter>("all")
  const active =
    filter === "all" ? undefined : filter === "active" ? true : false

  const { coupons, loading, error } = useAdminBillingCoupons(active)
  const { toggleCoupon, isPending: toggling, error: toggleError } =
    useToggleBillingCoupon()

  const [createOpen, setCreateOpen] = React.useState(false)
  const [deactivating, setDeactivating] = React.useState<BillingCoupon | null>(
    null,
  )

  const emptyMessage =
    filter === "active"
      ? "Nenhum cupom ativo."
      : filter === "inactive"
        ? "Nenhum cupom inativo."
        : "Nenhum cupom encontrado."

  async function handleActivate(coupon: BillingCoupon) {
    await toggleCoupon({ id: coupon.id, active: true })
  }

  async function handleConfirmDeactivate() {
    if (!deactivating) return
    await toggleCoupon({ id: deactivating.id, active: false })
    setDeactivating(null)
  }

  return (
    <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground">
          Cupons de desconto
        </h2>
        <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
          Criar cupom
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(
          [
            { value: "all", label: "Todos" },
            { value: "active", label: "Ativos" },
            { value: "inactive", label: "Inativos" },
          ] as const
        ).map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={filter === option.value ? "default" : "outline"}
            onClick={() => setFilter(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {toggleError && deactivating === null && (
        <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {toggleError}
        </div>
      )}

      <div className="mt-6">
        {loading && (
          <div className="space-y-px">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-md bg-foreground/[0.02]"
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && coupons.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-foreground/40">
            <TicketPercent className="h-8 w-8" />
            <p className="text-sm">{emptyMessage}</p>
          </div>
        )}

        {!loading && !error && coupons.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-foreground/[0.06]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Desconto</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Duração
                  </TableHead>
                  <TableHead>Resgates</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Expira em
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell className="font-medium text-foreground">
                      {coupon.code ?? "—"}
                    </TableCell>
                    <TableCell className="text-foreground/70">
                      {coupon.name}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {discountCell(coupon)}
                    </TableCell>
                    <TableCell className="hidden text-foreground/70 sm:table-cell">
                      {durationCell(coupon)}
                    </TableCell>
                    <TableCell className="tabular-nums text-foreground/70">
                      {coupon.timesRedeemed}/{coupon.maxRedemptions ?? "∞"}
                    </TableCell>
                    <TableCell className="hidden text-foreground/50 sm:table-cell">
                      {coupon.expiresAt ? fmtDate(coupon.expiresAt) : "—"}
                    </TableCell>
                    <TableCell>
                      {coupon.active ? (
                        <Badge className="bg-success/15 text-success">
                          Ativo
                        </Badge>
                      ) : (
                        <Badge className="bg-foreground/10 text-foreground/50">
                          Inativo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {coupon.active ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={toggling}
                          onClick={() => setDeactivating(coupon)}
                        >
                          Desativar
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={toggling}
                          onClick={() => void handleActivate(coupon)}
                        >
                          Ativar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <CreateCouponDialog open={createOpen} onClose={() => setCreateOpen(false)} />

      <ConfirmDialog
        open={deactivating !== null}
        onOpenChange={(o) => !o && !toggling && setDeactivating(null)}
        title="Desativar cupom"
        description={
          deactivating
            ? `Desativar o cupom "${deactivating.code || deactivating.name}"? O código deixa de funcionar e o cupom é arquivado: ele continua existindo para referência, mas não pode mais ser resgatado por novos clientes. Resgates já feitos não são afetados.`
            : undefined
        }
        confirmLabel="Desativar"
        destructive
        loading={toggling}
        error={toggleError}
        onConfirm={() => void handleConfirmDeactivate()}
      />
    </div>
  )
}

function CreateCouponDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { createCoupon, isPending, error, reset } = useCreateBillingCoupon()

  const [values, setValues] = React.useState<CouponFormValues>(EMPTY_COUPON_FORM)
  const [step, setStep] = React.useState<"form" | "review">("form")

  React.useEffect(() => {
    if (open) {
      setValues(EMPTY_COUPON_FORM)
      setStep("form")
      reset()
    }
  }, [open, reset])

  function setField<K extends keyof CouponFormValues>(
    key: K,
    value: CouponFormValues[K],
  ) {
    reset()
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  const {
    name,
    discountKind,
    percentOff,
    amountOff,
    duration,
    durationInMonths,
    code,
    maxRedemptions,
    expiresAt,
  } = values

  const formErrors = getCouponFormErrors(values)
  const canReview = formErrors.length === 0 && !isPending

  const codeTouched = code.trim() !== ""
  const codeError = codeTouched ? validateCouponCode(code) : null

  const percentNotInteger =
    discountKind === "percent" &&
    percentOff.trim() !== "" &&
    formErrors.includes("discount")
  const durationInMonthsInvalid =
    duration === "repeating" &&
    durationInMonths.trim() !== "" &&
    parsePositiveInteger(durationInMonths) === null
  const maxRedemptionsInvalid = formErrors.includes("maxRedemptions")

  async function handleCreate() {
    const input = buildCreateCouponInput(values)
    if (!input || isPending) return

    try {
      await createCoupon(input)
    } catch {
      // Permanece no passo de revisão; a mensagem vem de `error` da mutation.
      return
    }
    onClose()
  }

  const summaryRows = step === "review" ? buildCouponSummary(values) : []

  return (
    <Dialog open={open} onOpenChange={(o) => !isPending && !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "review" ? "Confirmar criação do cupom" : "Criar cupom"}
          </DialogTitle>
          <DialogDescription>
            {step === "review"
              ? "Confira os dados abaixo. Depois de criado, o código e o limite de resgates não podem ser corrigidos: será preciso desativar o cupom e criar outro (o código pode ser reutilizado depois de desativado)."
              : "Cria um cupom de desconto e sincroniza com o Stripe."}
          </DialogDescription>
        </DialogHeader>

        {step === "review" && (
          <dl className="divide-y divide-foreground/[0.06] rounded-lg border border-foreground/[0.06]">
            {summaryRows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-4 px-3 py-2 text-sm"
              >
                <dt className="text-foreground/60">{row.label}</dt>
                <dd
                  className={cn(
                    "text-right font-medium text-foreground",
                    row.label === "Limite de resgates" && "text-base",
                  )}
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        <div className={cn("space-y-4", step === "review" && "hidden")}>
          <div className="space-y-1.5">
            <Label htmlFor="coupon-name">Nome</Label>
            <Input
              id="coupon-name"
              value={name}
              onChange={(e) => setField("name", e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de desconto</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={discountKind === "percent" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setField("discountKind", "percent")}
              >
                Percentual
              </Button>
              <Button
                type="button"
                size="sm"
                variant={discountKind === "amount" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setField("discountKind", "amount")}
              >
                Valor fixo
              </Button>
            </div>
          </div>

          {discountKind === "percent" ? (
            <div className="space-y-1.5">
              <Label htmlFor="coupon-percent">Desconto (%)</Label>
              <Input
                id="coupon-percent"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={percentOff}
                onChange={(e) => setField("percentOff", e.target.value)}
              />
              {percentNotInteger && (
                <p className="text-sm text-destructive">
                  Informe um número inteiro de 1 a 100.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="coupon-amount">Valor do desconto (R$)</Label>
              <Input
                id="coupon-amount"
                value={amountOff}
                onChange={(e) => setField("amountOff", e.target.value)}
                placeholder="0,00"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="coupon-duration">Duração</Label>
            <Select
              value={duration}
              onValueChange={(v) => setField("duration", v as CouponDuration)}
            >
              <SelectTrigger id="coupon-duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="once">Única</SelectItem>
                <SelectItem value="repeating">Recorrente</SelectItem>
                <SelectItem value="forever">Permanente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {duration === "repeating" && (
            <div className="space-y-1.5">
              <Label htmlFor="coupon-duration-months">Duração (meses)</Label>
              <Input
                id="coupon-duration-months"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={durationInMonths}
                onChange={(e) => setField("durationInMonths", e.target.value)}
              />
              {durationInMonthsInvalid && (
                <p className="text-sm text-destructive">
                  Informe um número inteiro maior que zero.
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="coupon-code">Código</Label>
            <Input
              id="coupon-code"
              value={code}
              onChange={(e) => setField("code", e.target.value.toUpperCase())}
              placeholder="Ex.: LANCAMENTO20"
              autoComplete="off"
              required
            />
            {codeError ? (
              <p className="text-sm text-destructive">
                {COUPON_CODE_ERROR_MESSAGES[codeError]}
              </p>
            ) : (
              <p className="text-xs text-foreground/50">
                Obrigatório. De 3 a 64 caracteres: letras, números, hífen ou
                sublinhado. É o código que o cliente digita.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="coupon-max-redemptions">Máximo de resgates</Label>
            <Input
              id="coupon-max-redemptions"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={maxRedemptions}
              onChange={(e) => setField("maxRedemptions", e.target.value)}
              placeholder="Vazio = sem limite"
            />
            {maxRedemptionsInvalid && (
              <p className="text-sm text-destructive">
                Informe um número inteiro maior que zero.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="coupon-expires-at">Expira em</Label>
            <DatePicker
              id="coupon-expires-at"
              value={expiresAt}
              onChange={(v) => setField("expiresAt", v)}
              placeholder="Sem expiração"
              startMonth={new Date()}
              endMonth={new Date(new Date().getFullYear() + 5, 11)}
            />
            {formErrors.includes("expiresAt") && (
              <p className="text-sm text-destructive">
                Escolha uma data futura. O cupom vale até o fim do dia escolhido.
              </p>
            )}
          </div>

        </div>

        {error && (
          <p
            role="alert"
            className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        <DialogFooter>
          {step === "review" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  reset()
                  setStep("form")
                }}
                disabled={isPending}
              >
                Voltar e editar
              </Button>
              <Button
                type="button"
                onClick={() => void handleCreate()}
                disabled={isPending}
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirmar e criar
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => setStep("review")}
                disabled={!canReview}
              >
                Revisar
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
