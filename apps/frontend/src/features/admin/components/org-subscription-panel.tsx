"use client"

import * as React from "react"
import { ShieldCheck, Percent, Receipt, Loader2 } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"
import { Label } from "@/shared/components/ui/label"
import { DatePicker } from "@/shared/components/ui/date-picker"
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
  NormalizedInvoice,
  Subscription,
  SubscriptionStatus,
  SubscriptionType,
} from "@/features/billing/types"
import {
  useAdminSubscription,
  useAdminSubscriptionInvoices,
  useApplyDiscount,
  useGrantComp,
  useRemoveDiscount,
  useRevokeComp,
} from "../hooks/use-admin-subscription"
import { fmtDate } from "../lib/format"
import { ConfirmDialog } from "./confirm-dialog"

const TYPE_LABELS: Record<SubscriptionType, string> = {
  free: "Gratuito",
  trial: "Trial",
  standard: "Padrão",
  custom: "Cortesia",
}

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: "Ativa",
  trialing: "Em trial",
  past_due: "Inadimplente",
  canceled: "Cancelada",
}

const STATUS_BADGE_CLASSES: Record<SubscriptionStatus, string> = {
  active: "bg-emerald-500/15 text-emerald-400",
  trialing: "bg-orange-500/15 text-orange-400",
  past_due: "bg-red-500/15 text-red-400",
  canceled: "bg-foreground/10 text-foreground/50",
}

const INTERVAL_LABELS: Record<BillingInterval, string> = {
  monthly: "mensal",
  semiannual: "semestral",
  annual: "anual",
}

function fmtDateOrDash(iso: string | null): string {
  return iso ? fmtDate(iso) : "—"
}

interface OrgSubscriptionPanelOrg {
  id: string
  name: string
  slug: string
}

export function OrgSubscriptionPanel({ org }: { org: OrgSubscriptionPanelOrg }) {
  const { subscription, loading, error } = useAdminSubscription(org.id)
  const { invoices, loading: invoicesLoading } = useAdminSubscriptionInvoices(org.id)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-foreground/30">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  if (error || !subscription) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
        {error ?? "Não foi possível carregar a assinatura desta organização."}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SubscriptionCard org={org} subscription={subscription} />
      <div className="grid gap-4 sm:grid-cols-2">
        <CompPanel orgId={org.id} subscription={subscription} />
        <DiscountPanel orgId={org.id} subscription={subscription} />
      </div>
      <InvoicesSection invoices={invoices} loading={invoicesLoading} />
    </div>
  )
}

function SubscriptionCard({
  org,
  subscription,
}: {
  org: OrgSubscriptionPanelOrg
  subscription: Subscription
}) {
  return (
    <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">{org.name}</h2>
          <p className="text-xs text-foreground/40">/{org.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{TYPE_LABELS[subscription.type]}</Badge>
          <Badge className={STATUS_BADGE_CLASSES[subscription.status]}>
            {STATUS_LABELS[subscription.status]}
          </Badge>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <InfoStat
          label="Plano"
          value={
            subscription.priceCents !== null
              ? `${formatBRL(subscription.priceCents)}${
                  subscription.billingInterval
                    ? ` / ${INTERVAL_LABELS[subscription.billingInterval]}`
                    : ""
                }`
              : "—"
          }
        />
        <InfoStat label="Trial até" value={fmtDateOrDash(subscription.trialEndsAt)} />
        <InfoStat
          label="Período atual até"
          value={fmtDateOrDash(subscription.currentPeriodEnd)}
        />
        <InfoStat
          label="Stripe"
          value={subscription.stripeCustomerId ? "Vinculado" : "Não vinculado"}
        />
      </div>
    </div>
  )
}

function InfoStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-foreground/40">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}

function CompPanel({
  orgId,
  subscription,
}: {
  orgId: string
  subscription: Subscription
}) {
  const { grantComp, isPending: granting, error: grantError } = useGrantComp(orgId)
  const { revokeComp, isPending: revoking, error: revokeError } = useRevokeComp(orgId)

  const [reason, setReason] = React.useState("")
  const [expiresAt, setExpiresAt] = React.useState("")
  const [confirmingRevoke, setConfirmingRevoke] = React.useState(false)

  const isComp = subscription.type === "custom"

  async function handleGrant(e: React.FormEvent) {
    e.preventDefault()
    if (!reason.trim()) return
    await grantComp({
      reason: reason.trim(),
      ...(expiresAt ? { expiresAt } : {}),
    })
    setReason("")
    setExpiresAt("")
  }

  async function handleRevoke() {
    await revokeComp()
    setConfirmingRevoke(false)
  }

  return (
    <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-orange-400" />
        <h3 className="text-sm font-medium text-foreground">Isenção (cortesia)</h3>
      </div>

      {isComp ? (
        <div className="mt-3 space-y-3 text-sm">
          <p className="text-foreground/70">
            {subscription.compReason ?? "Sem motivo registrado."}
          </p>
          <p className="text-foreground/50">
            Validade:{" "}
            {subscription.compExpiresAt
              ? fmtDate(subscription.compExpiresAt)
              : "perpétua"}
          </p>
          {revokeError && <p className="text-sm text-red-400">{revokeError}</p>}
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setConfirmingRevoke(true)}
          >
            Revogar isenção
          </Button>
        </div>
      ) : (
        <form onSubmit={(e) => void handleGrant(e)} className="mt-3 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="comp-reason">Motivo</Label>
            <Textarea
              id="comp-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex.: parceria, cortesia comercial…"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="comp-expires">Validade (opcional)</Label>
            <DatePicker
              id="comp-expires"
              value={expiresAt}
              onChange={setExpiresAt}
              placeholder="Sem validade (perpétua)"
            />
          </div>
          {grantError && <p className="text-sm text-red-400">{grantError}</p>}
          <Button type="submit" size="sm" disabled={granting || !reason.trim()}>
            {granting && <Loader2 className="h-4 w-4 animate-spin" />}
            Conceder isenção
          </Button>
        </form>
      )}

      <ConfirmDialog
        open={confirmingRevoke}
        onOpenChange={setConfirmingRevoke}
        title="Revogar isenção?"
        description="A organização volta a depender da cobrança normal via Stripe."
        confirmLabel="Revogar"
        destructive
        loading={revoking}
        error={revokeError}
        onConfirm={() => void handleRevoke()}
      />
    </div>
  )
}

function DiscountPanel({
  orgId,
  subscription,
}: {
  orgId: string
  subscription: Subscription
}) {
  const { applyDiscount, isPending: applying, error: applyError } =
    useApplyDiscount(orgId)
  const { removeDiscount, isPending: removing, error: removeError } =
    useRemoveDiscount(orgId)

  const [percentOff, setPercentOff] = React.useState("")
  const [durationMonths, setDurationMonths] = React.useState("")
  const [confirmingRemove, setConfirmingRemove] = React.useState(false)

  const hasDiscount = subscription.discountPercent !== null
  const stripeLinked =
    !!subscription.stripeCustomerId && !!subscription.stripeSubscriptionId

  async function handleApply(e: React.FormEvent) {
    e.preventDefault()
    const percent = Number.parseInt(percentOff, 10)
    if (!Number.isFinite(percent) || percent < 1 || percent > 100) return
    const months = durationMonths.trim()
      ? Number.parseInt(durationMonths, 10)
      : undefined
    await applyDiscount({
      percentOff: percent,
      ...(months !== undefined && Number.isFinite(months)
        ? { durationMonths: months }
        : {}),
    })
    setPercentOff("")
    setDurationMonths("")
  }

  async function handleRemove() {
    await removeDiscount()
    setConfirmingRemove(false)
  }

  return (
    <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <Percent className="h-4 w-4 text-orange-400" />
        <h3 className="text-sm font-medium text-foreground">Desconto</h3>
      </div>

      {hasDiscount ? (
        <div className="mt-3 space-y-3 text-sm">
          <p className="text-foreground/70">
            {subscription.discountPercent}% de desconto
            {subscription.stripeCouponId
              ? ` (cupom ${subscription.stripeCouponId})`
              : ""}
          </p>
          {removeError && <p className="text-sm text-red-400">{removeError}</p>}
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setConfirmingRemove(true)}
          >
            Remover desconto
          </Button>
        </div>
      ) : (
        <form onSubmit={(e) => void handleApply(e)} className="mt-3 space-y-3">
          {!stripeLinked && (
            <p className="rounded-md border border-orange-500/20 bg-orange-500/10 px-3 py-2 text-xs text-orange-300">
              Esta organização ainda não está vinculada ao Stripe — descontos
              exigem uma assinatura ativa via Stripe.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="discount-percent">% de desconto</Label>
              <Input
                id="discount-percent"
                type="number"
                min={1}
                max={100}
                value={percentOff}
                onChange={(e) => setPercentOff(e.target.value)}
                disabled={!stripeLinked}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="discount-duration">Duração (meses)</Label>
              <Input
                id="discount-duration"
                type="number"
                min={1}
                value={durationMonths}
                onChange={(e) => setDurationMonths(e.target.value)}
                disabled={!stripeLinked}
                placeholder="Opcional"
              />
            </div>
          </div>
          {applyError && <p className="text-sm text-red-400">{applyError}</p>}
          <Button
            type="submit"
            size="sm"
            disabled={applying || !stripeLinked || !percentOff}
          >
            {applying && <Loader2 className="h-4 w-4 animate-spin" />}
            Aplicar desconto
          </Button>
        </form>
      )}

      <ConfirmDialog
        open={confirmingRemove}
        onOpenChange={setConfirmingRemove}
        title="Remover desconto?"
        description="A organização volta a pagar o valor integral do plano."
        confirmLabel="Remover"
        destructive
        loading={removing}
        error={removeError}
        onConfirm={() => void handleRemove()}
      />
    </div>
  )
}

function InvoicesSection({
  invoices,
  loading,
}: {
  invoices: NormalizedInvoice[]
  loading: boolean
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium text-foreground">Faturas</h3>
      <div className="overflow-hidden rounded-xl border border-foreground/[0.06]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv) => (
              <TableRow key={inv.stripeInvoiceId}>
                <TableCell className="text-foreground/70">
                  {fmtDate(inv.occurredAt)}
                </TableCell>
                <TableCell>
                  {inv.type === "paid" ? (
                    <Badge className="bg-emerald-500/15 text-emerald-400">Pago</Badge>
                  ) : (
                    <Badge className="bg-red-500/15 text-red-400">Falhou</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums text-foreground/70">
                  {formatBRL(inv.amountCents)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {!loading && invoices.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <Receipt className="h-6 w-6 text-foreground/20" />
            <p className="text-sm text-foreground/50">
              Nenhuma fatura registrada ainda.
            </p>
          </div>
        )}
        {loading && (
          <div className="space-y-px">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse bg-foreground/[0.02]" />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
