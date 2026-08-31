"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import { useRouter } from "next/router"
import {
  CreditCard,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog"
import { cn } from "@/shared/lib/utils"
import { useCurrentOrg } from "@/features/dashboard/components/org-context"
import { formatBRL } from "@/features/cashier/lib/money"
import { useSubscription } from "../hooks/use-subscription"
import { usePublicBillingPlans } from "../hooks/use-public-billing-plans"
import {
  useCreateCheckoutSession,
  useCreatePortalSession,
  useResumeSubscription,
  useScheduleSubscriptionCancellation,
} from "../hooks/use-billing-mutations"
import type { BillingInterval, Subscription } from "../types"

const BILLING_INTERVAL_LABELS: Record<BillingInterval, string> = {
  monthly: "mensal",
  semiannual: "semestral",
  annual: "anual",
}

const INTERVAL_OPTIONS: { value: BillingInterval; label: string }[] = [
  { value: "monthly", label: "Mensal" },
  { value: "semiannual", label: "Semestral" },
  { value: "annual", label: "Anual" },
]

// O checkout (POST /orgs/:orgId/subscription/checkout) sempre resolve o
// plano fixo DEFAULT_PLAN_KEY = "standard" no backend (não recebe plano,
// só intervalo) — então só os intervalos com preço ativo desse plano
// específico são válidos para o seletor, não a união de todos os planos
// públicos retornados.
const CHECKOUT_PLAN_KEY = "standard"

function formatDate(iso: string | null): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function checkoutQueryParam(
  value: string | string[] | undefined,
): "success" | "cancel" | null {
  const raw = Array.isArray(value) ? value[0] : value
  return raw === "success" || raw === "cancel" ? raw : null
}

function CheckoutBanner({ status }: { status: "success" | "cancel" }) {
  if (status === "success") {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-success/20 bg-success/[0.06] p-4 text-sm text-success">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
        <p>Assinatura confirmada com sucesso.</p>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4 text-sm text-foreground/60">
      <XCircle className="h-4 w-4 shrink-0 text-foreground/40" />
      <p>Checkout cancelado. Nenhuma cobrança foi feita.</p>
    </div>
  )
}

function SectionShell({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon
  title: string
  children: ReactNode
}) {
  return (
    <section className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-5">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      <div className="mt-3 space-y-3 text-sm text-foreground/60">
        {children}
      </div>
    </section>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-foreground/50">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}

// Compartilhado por ActiveSection e TrialingSection: botão de portal
// (mantido de cada seção), botão "Cancelar assinatura" (abre o dialog) ou
// "Reativar assinatura" (chama o resume direto, é reversão não destrutiva).
// Os 3 hooks vivem no mesmo escopo, com desestruturações renomeadas para
// evitar colisão de isPending/error.
function ManageSubscriptionActions({
  subscription,
  orgId,
  portalLabel,
  showPortal,
  accessUntilDate,
}: {
  subscription: Subscription
  orgId: string
  portalLabel: string
  showPortal: boolean
  accessUntilDate: string | null
}) {
  const [cancelOpen, setCancelOpen] = useState(false)
  const {
    createPortalSession,
    isPending: isPortalPending,
    error: portalError,
  } = useCreatePortalSession(orgId)
  const {
    scheduleCancellation,
    isPending: isSchedulePending,
    error: scheduleError,
  } = useScheduleSubscriptionCancellation(orgId)
  const {
    resumeSubscription,
    isPending: isResumePending,
    error: resumeError,
  } = useResumeSubscription(orgId)

  const anyPending = isPortalPending || isSchedulePending || isResumePending
  const canManageStripe =
    Boolean(subscription.stripeCustomerId) &&
    Boolean(subscription.stripeSubscriptionId)
  const cancelDescription = accessUntilDate
    ? `O acesso continua até ${accessUntilDate} e não haverá nova cobrança. Você pode reativar antes dessa data.`
    : "O acesso continua até o fim do período atual e não haverá nova cobrança. Você pode reativar antes dessa data."

  return (
    <>
      {portalError && <p className="text-sm text-destructive">{portalError}</p>}
      {resumeError && <p className="text-sm text-destructive">{resumeError}</p>}
      {subscription.cancelAtPeriodEnd && accessUntilDate && (
        <p className="text-sm text-warning">
          Sua assinatura será encerrada em {accessUntilDate} e não haverá nova
          cobrança.
        </p>
      )}
      {(showPortal || canManageStripe) && (
        <div className={cn("flex flex-col gap-2 sm:flex-row")}>
          {showPortal && (
            <Button
              type="button"
              disabled={anyPending}
              onClick={() => createPortalSession()}
            >
              {isPortalPending ? "Abrindo…" : portalLabel}
            </Button>
          )}
          {canManageStripe &&
            (subscription.cancelAtPeriodEnd ? (
              <Button
                type="button"
                disabled={anyPending}
                onClick={() => resumeSubscription()}
              >
                {isResumePending ? "Reativando…" : "Reativar assinatura"}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled={anyPending}
                onClick={() => setCancelOpen(true)}
              >
                Cancelar assinatura
              </Button>
            ))}
        </div>
      )}
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        destructive
        title="Cancelar assinatura"
        description={cancelDescription}
        confirmLabel="Cancelar assinatura"
        cancelLabel="Manter assinatura"
        loading={isSchedulePending}
        error={scheduleError}
        onConfirm={() =>
          scheduleCancellation(undefined, {
            onSuccess: () => setCancelOpen(false),
          })
        }
      />
    </>
  )
}

function CompSection({ subscription }: { subscription: Subscription }) {
  return (
    <SectionShell icon={ShieldCheck} title="Acesso cortesia">
      <p>
        Esta organização possui acesso cortesia (sem cobrança via Stripe)
        {subscription.compReason ? `: ${subscription.compReason}` : "."}
      </p>
      {subscription.compExpiresAt && (
        <InfoRow
          label="Válido até"
          value={formatDate(subscription.compExpiresAt) ?? "—"}
        />
      )}
    </SectionShell>
  )
}

function TrialingSection({
  subscription,
  isOwner,
  orgId,
}: {
  subscription: Subscription
  isOwner: boolean
  orgId: string
}) {
  return (
    <SectionShell icon={CreditCard} title="Período de teste">
      <p>Sua organização está em período de teste gratuito.</p>
      <InfoRow
        label="Teste termina em"
        value={formatDate(subscription.trialEndsAt) ?? "—"}
      />
      {isOwner && (
        <ManageSubscriptionActions
          subscription={subscription}
          orgId={orgId}
          portalLabel="Gerenciar forma de pagamento"
          showPortal={!!subscription.stripeCustomerId}
          accessUntilDate={formatDate(subscription.trialEndsAt)}
        />
      )}
    </SectionShell>
  )
}

function ActiveSection({
  subscription,
  isOwner,
  orgId,
}: {
  subscription: Subscription
  isOwner: boolean
  orgId: string
}) {
  const periodEndLabel = formatDate(subscription.currentPeriodEnd) ?? "—"

  return (
    <SectionShell icon={CreditCard} title="Assinatura ativa">
      {subscription.priceCents !== null && (
        <InfoRow
          label="Plano"
          value={`${formatBRL(subscription.priceCents)}${
            subscription.billingInterval
              ? ` / ${BILLING_INTERVAL_LABELS[subscription.billingInterval]}`
              : ""
          }`}
        />
      )}
      <InfoRow
        label={
          subscription.cancelAtPeriodEnd ? "Encerra em" : "Próxima cobrança"
        }
        value={periodEndLabel}
      />
      {isOwner && (
        <ManageSubscriptionActions
          subscription={subscription}
          orgId={orgId}
          portalLabel="Gerenciar assinatura"
          showPortal
          accessUntilDate={formatDate(subscription.currentPeriodEnd)}
        />
      )}
    </SectionShell>
  )
}

function PastDueSection({
  isOwner,
  orgId,
}: {
  isOwner: boolean
  orgId: string
}) {
  const { createPortalSession, isPending, error } = useCreatePortalSession(orgId)

  return (
    <SectionShell icon={AlertTriangle} title="Pagamento pendente">
      <p>
        Não conseguimos confirmar o último pagamento. Atualize a forma de
        pagamento para evitar a suspensão do acesso.
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {isOwner && (
        <Button
          type="button"
          variant="destructive"
          disabled={isPending}
          onClick={() => createPortalSession()}
        >
          {isPending ? "Abrindo…" : "Atualizar forma de pagamento"}
        </Button>
      )}
    </SectionShell>
  )
}

function IntervalSelector({
  value,
  onChange,
  disabled,
  availableIntervals,
}: {
  value: BillingInterval
  onChange: (interval: BillingInterval) => void
  disabled: boolean
  availableIntervals: BillingInterval[]
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Intervalo de cobrança"
      className="grid grid-cols-3 gap-2"
    >
      {INTERVAL_OPTIONS.map(({ value: optionValue, label }) => {
        const available = availableIntervals.includes(optionValue)
        const active = value === optionValue
        return (
          <button
            key={optionValue}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled || !available}
            onClick={() => onChange(optionValue)}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-lg border p-2.5 text-xs transition-colors",
              !available && "cursor-not-allowed opacity-50",
              active && available
                ? "border-primary/60 bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:enabled:bg-foreground/[0.03] hover:enabled:text-foreground",
            )}
          >
            <span>{label}</span>
            {!available && (
              <span className="text-[10px] text-muted-foreground/70">
                em breve
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function LockedSection({
  isOwner,
  orgId,
}: {
  isOwner: boolean
  orgId: string
}) {
  const [selectedInterval, setSelectedInterval] =
    useState<BillingInterval>("monthly")
  const { createCheckoutSession, isPending, error } =
    useCreateCheckoutSession(orgId)
  const { plans } = usePublicBillingPlans()

  // Sem plano público retornado (endpoint atrás de kill-switch
  // PUBLIC_PRICING_ENABLED, geralmente desligado, ou plano "standard"
  // ausente da lista), o único intervalo garantido é "monthly".
  const checkoutPlan = plans.find((plan) => plan.key === CHECKOUT_PLAN_KEY)
  const availableIntervals: BillingInterval[] = checkoutPlan
    ? checkoutPlan.prices.map((p) => p.interval)
    : ["monthly"]

  // Deriva o intervalo efetivo em vez de confiar cegamente no estado local:
  // se o intervalo selecionado deixar de estar disponível (ex.: dado
  // assíncrono chegou depois da seleção inicial "monthly"), cai para o
  // primeiro disponível — nunca envia ao checkout um intervalo sem preço.
  const effectiveInterval: BillingInterval =
    availableIntervals.find((interval) => interval === selectedInterval) ??
    availableIntervals[0] ??
    "monthly"

  return (
    <SectionShell icon={CreditCard} title="Assinatura">
      <p>
        Esta organização ainda não tem uma assinatura ativa. Assine para
        continuar usando o sistema.
      </p>
      {isOwner && (
        <IntervalSelector
          value={effectiveInterval}
          onChange={setSelectedInterval}
          disabled={isPending}
          availableIntervals={availableIntervals}
        />
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {isOwner && (
        <Button
          type="button"
          disabled={isPending}
          onClick={() => createCheckoutSession(effectiveInterval)}
        >
          {isPending ? "Abrindo…" : "Assinar agora"}
        </Button>
      )}
    </SectionShell>
  )
}

export function SubscriptionPage() {
  const { org, orgId } = useCurrentOrg()
  const router = useRouter()
  const isOwner = org.role === "owner"
  const checkoutStatus = checkoutQueryParam(router.query.checkout)

  const { subscription, loading, error } = useSubscription(orgId)

  return (
    <div className="grid gap-8">
      <div>
        <h2 className="text-lg font-semibold">Assinatura</h2>
        <p className="mt-0.5 text-sm text-foreground/40">
          Plano, histórico de cobrança e gerenciamento da assinatura desta
          organização.
        </p>
      </div>

      {checkoutStatus && <CheckoutBanner status={checkoutStatus} />}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-foreground/40">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Carregando…
        </div>
      ) : error || !subscription ? (
        <p className="text-sm text-destructive">
          {error ?? "Não foi possível carregar os dados de assinatura."}
        </p>
      ) : subscription.type === "custom" ? (
        <CompSection subscription={subscription} />
      ) : subscription.status === "trialing" ? (
        <TrialingSection
          subscription={subscription}
          isOwner={isOwner}
          orgId={orgId}
        />
      ) : subscription.status === "active" ? (
        <ActiveSection
          subscription={subscription}
          isOwner={isOwner}
          orgId={orgId}
        />
      ) : subscription.status === "past_due" ? (
        <PastDueSection isOwner={isOwner} orgId={orgId} />
      ) : (
        <LockedSection isOwner={isOwner} orgId={orgId} />
      )}
    </div>
  )
}
