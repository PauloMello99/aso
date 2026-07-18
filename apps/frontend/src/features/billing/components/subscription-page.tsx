"use client"

import type { ReactNode } from "react"
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
import { useCurrentOrg } from "@/features/dashboard/components/org-context"
import { formatBRL } from "@/features/cashier/lib/money"
import { useSubscription } from "../hooks/use-subscription"
import {
  useCreateCheckoutSession,
  useCreatePortalSession,
} from "../hooks/use-billing-mutations"
import type { BillingInterval, Subscription } from "../types"

const BILLING_INTERVAL_LABELS: Record<BillingInterval, string> = {
  monthly: "mensal",
  semiannual: "semestral",
  annual: "anual",
}

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
      <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4 text-sm text-emerald-300">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
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
        <Icon className="h-4 w-4 text-orange-400" />
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
  const { createPortalSession, isPending, error } = useCreatePortalSession(orgId)

  return (
    <SectionShell icon={CreditCard} title="Período de teste">
      <p>Sua organização está em período de teste gratuito.</p>
      <InfoRow
        label="Teste termina em"
        value={formatDate(subscription.trialEndsAt) ?? "—"}
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      {isOwner && subscription.stripeCustomerId && (
        <Button
          type="button"
          disabled={isPending}
          onClick={() => createPortalSession()}
        >
          {isPending ? "Abrindo…" : "Gerenciar forma de pagamento"}
        </Button>
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
  const { createPortalSession, isPending, error } = useCreatePortalSession(orgId)

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
        label="Próxima cobrança"
        value={formatDate(subscription.currentPeriodEnd) ?? "—"}
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      {isOwner && (
        <Button
          type="button"
          disabled={isPending}
          onClick={() => createPortalSession()}
        >
          {isPending ? "Abrindo…" : "Gerenciar assinatura"}
        </Button>
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
      {error && <p className="text-sm text-red-400">{error}</p>}
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

function LockedSection({
  isOwner,
  orgId,
}: {
  isOwner: boolean
  orgId: string
}) {
  const { createCheckoutSession, isPending, error } =
    useCreateCheckoutSession(orgId)

  return (
    <SectionShell icon={CreditCard} title="Assinatura">
      <p>
        Esta organização ainda não tem uma assinatura ativa. Assine para
        continuar usando o sistema.
      </p>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {isOwner && (
        <Button
          type="button"
          disabled={isPending}
          onClick={() => createCheckoutSession()}
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
        <p className="mt-0.5 text-sm text-foreground/50">
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
        <p className="text-sm text-red-400">
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
