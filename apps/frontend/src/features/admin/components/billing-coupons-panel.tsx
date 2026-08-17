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
import { formatBRL, parseReaisToCents } from "@/features/cashier/lib/money"
import type {
  BillingCoupon,
  CouponDuration,
  CreateBillingCouponInput,
} from "@/features/billing/types"
import {
  useAdminBillingCoupons,
  useCreateBillingCoupon,
  useToggleBillingCoupon,
} from "../hooks/use-admin-billing-coupons"
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
            ? `Desativar o cupom "${deactivating.code || deactivating.name}"? Ele deixará de poder ser resgatado por novos clientes; resgates já feitos não são afetados.`
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

type DiscountKind = "percent" | "amount"

function CreateCouponDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { createCoupon, isPending, error } = useCreateBillingCoupon()

  const [name, setName] = React.useState("")
  const [discountKind, setDiscountKind] = React.useState<DiscountKind>("percent")
  const [percentOff, setPercentOff] = React.useState("")
  const [amountOff, setAmountOff] = React.useState("")
  const [duration, setDuration] = React.useState<CouponDuration>("once")
  const [durationInMonths, setDurationInMonths] = React.useState("")
  const [code, setCode] = React.useState("")
  const [maxRedemptions, setMaxRedemptions] = React.useState("")
  const [expiresAt, setExpiresAt] = React.useState("")

  React.useEffect(() => {
    if (open) {
      setName("")
      setDiscountKind("percent")
      setPercentOff("")
      setAmountOff("")
      setDuration("once")
      setDurationInMonths("")
      setCode("")
      setMaxRedemptions("")
      setExpiresAt("")
    }
  }, [open])

  const percentValue = Number(percentOff)
  const amountCentsValue = amountOff ? parseReaisToCents(amountOff) : Number.NaN
  const durationInMonthsNum = Number(durationInMonths)
  const maxRedemptionsNumber = Number(maxRedemptions)

  const hasValidDiscount =
    discountKind === "percent"
      ? percentOff.trim() !== "" &&
        Number.isFinite(percentValue) &&
        Number.isInteger(percentValue) &&
        percentValue > 0 &&
        percentValue <= 100
      : amountOff.trim() !== "" &&
        Number.isFinite(amountCentsValue) &&
        amountCentsValue > 0

  const percentNotInteger =
    discountKind === "percent" &&
    percentOff.trim() !== "" &&
    Number.isFinite(percentValue) &&
    !Number.isInteger(percentValue)

  const durationInMonthsValid =
    duration !== "repeating" ||
    (durationInMonths.trim() !== "" &&
      Number.isFinite(durationInMonthsNum) &&
      Number.isInteger(durationInMonthsNum) &&
      durationInMonthsNum > 0)

  const durationInMonthsNotInteger =
    duration === "repeating" &&
    durationInMonths.trim() !== "" &&
    Number.isFinite(durationInMonthsNum) &&
    !Number.isInteger(durationInMonthsNum)

  const maxRedemptionsValid =
    maxRedemptions.trim() === "" ||
    (Number.isFinite(maxRedemptionsNumber) &&
      Number.isInteger(maxRedemptionsNumber) &&
      maxRedemptionsNumber > 0)

  const maxRedemptionsNotInteger =
    maxRedemptions.trim() !== "" &&
    Number.isFinite(maxRedemptionsNumber) &&
    (!Number.isInteger(maxRedemptionsNumber) || maxRedemptionsNumber <= 0)

  const canSubmit =
    name.trim().length > 0 &&
    hasValidDiscount &&
    durationInMonthsValid &&
    maxRedemptionsValid &&
    !isPending

  async function handleCreate() {
    if (!canSubmit) return

    const maxRedemptionsValue = maxRedemptions.trim()
      ? Number(maxRedemptions)
      : undefined
    const durationInMonthsValue =
      duration === "repeating" && durationInMonths.trim()
        ? Number(durationInMonths)
        : undefined

    const input: CreateBillingCouponInput = {
      name: name.trim(),
      duration,
      ...(discountKind === "percent"
        ? { percentOff: percentValue }
        : { amountOffCents: amountCentsValue, currency: "brl" }),
      ...(durationInMonthsValue !== undefined && {
        durationInMonths: durationInMonthsValue,
      }),
      ...(code.trim() && { code: code.trim() }),
      ...(maxRedemptionsValue !== undefined && {
        maxRedemptions: maxRedemptionsValue,
      }),
      ...(expiresAt && {
        expiresAt: new Date(`${expiresAt}T00:00:00`).toISOString(),
      }),
    }

    await createCoupon(input)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !isPending && !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar cupom</DialogTitle>
          <DialogDescription>
            Cria um cupom de desconto e sincroniza com o Stripe.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="coupon-name">Nome</Label>
            <Input
              id="coupon-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
                onClick={() => setDiscountKind("percent")}
              >
                Percentual
              </Button>
              <Button
                type="button"
                size="sm"
                variant={discountKind === "amount" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setDiscountKind("amount")}
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
                type="number"
                min={1}
                max={100}
                value={percentOff}
                onChange={(e) => setPercentOff(e.target.value)}
              />
              {percentNotInteger && (
                <p className="text-sm text-destructive">
                  Deve ser um número inteiro.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="coupon-amount">Valor do desconto (R$)</Label>
              <Input
                id="coupon-amount"
                value={amountOff}
                onChange={(e) => setAmountOff(e.target.value)}
                placeholder="0,00"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="coupon-duration">Duração</Label>
            <Select
              value={duration}
              onValueChange={(v) => setDuration(v as CouponDuration)}
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
                type="number"
                min={1}
                value={durationInMonths}
                onChange={(e) => setDurationInMonths(e.target.value)}
              />
              {durationInMonthsNotInteger && (
                <p className="text-sm text-destructive">
                  Deve ser um número inteiro.
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="coupon-code">Código</Label>
            <Input
              id="coupon-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="gerado automaticamente se vazio"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="coupon-max-redemptions">Máximo de resgates</Label>
            <Input
              id="coupon-max-redemptions"
              type="number"
              min={1}
              value={maxRedemptions}
              onChange={(e) => setMaxRedemptions(e.target.value)}
              placeholder="Opcional"
            />
            {maxRedemptionsNotInteger && (
              <p className="text-sm text-destructive">
                Deve ser um número inteiro.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="coupon-expires-at">Expira em</Label>
            <DatePicker
              id="coupon-expires-at"
              value={expiresAt}
              onChange={setExpiresAt}
              placeholder="Sem expiração"
              startMonth={new Date()}
              endMonth={new Date(new Date().getFullYear() + 5, 11)}
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
          <Button type="button" onClick={() => void handleCreate()} disabled={!canSubmit}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
