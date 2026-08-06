"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, FileHeart, Loader2, Pencil } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Separator } from "@/shared/components/ui/separator"
import { useCurrentOrg } from "@/features/dashboard"
import { canAccessModule } from "@/features/dashboard/lib/nav"
import {
  AnamnesisResponseViewer,
  SendAnamnesisInviteDialog,
  useAnamnesisResponses,
} from "@/features/anamnesis"
import { useCustomerDetail } from "../hooks/use-customer-detail"
import { useCustomers } from "../hooks/use-customers"
import { useCustomerOrigins } from "../hooks/use-customer-origins"
import { useServices } from "@/features/services/hooks/use-services"
import { ServiceDetailSheet } from "@/features/services/components/service-detail-sheet"
import { useTransactions } from "@/features/cashier/hooks/use-transactions"
import { AttachmentsSection } from "./attachments-section"
import { CustomerAnamnesisList } from "./customer-anamnesis-list"
import { CustomerForm } from "./customer-form"
import { StatusBadge } from "./customer-list"
import { CustomerServiceHistoryList } from "./customer-service-history-list"
import { CustomerTransactionHistoryList } from "./customer-transaction-history-list"
import type { CustomerFormValues } from "../schemas/client.schemas"
import type { Gender } from "../types"
import type { Service } from "@/features/services/types"

interface CustomerDetailPageProps {
  orgId: string
  orgSlug: string
  customerId: string | undefined
  routerReady: boolean
}

const GENDER_LABELS: Record<Gender, string> = {
  female: "Feminino",
  male: "Masculino",
  other: "Outro",
}

function fmtBirthDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-foreground/40">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  )
}

export function CustomerDetailPage({
  orgId,
  orgSlug,
  customerId,
  routerReady,
}: CustomerDetailPageProps) {
  const { customer, loading, error } = useCustomerDetail(orgId, customerId)
  const {
    services,
    loading: servicesLoading,
    error: servicesError,
  } = useServices(customerId ? orgId : "", customerId ? { customerId } : undefined)
  const {
    transactions,
    loading: transactionsLoading,
    error: transactionsError,
  } = useTransactions(
    customerId ? orgId : "",
    customerId ? { customerId } : undefined,
  )
  const { origins } = useCustomerOrigins(orgId)
  const { updateCustomer } = useCustomers(orgId)
  const { org } = useCurrentOrg()
  const canSendAnamnesisInvite = canAccessModule(
    org.role,
    org.permissions,
    "services",
  )
  const {
    responses: anamnesisResponses,
    loading: anamnesisResponsesLoading,
    error: anamnesisResponsesError,
  } = useAnamnesisResponses(
    customerId && canSendAnamnesisInvite ? orgId : "",
    customerId ? { customerId } : undefined,
  )

  const [formOpen, setFormOpen] = useState(false)
  const [anamnesisDialogOpen, setAnamnesisDialogOpen] = useState(false)
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
    null,
  )
  const [selectedAnamnesisResponseId, setSelectedAnamnesisResponseId] =
    useState<string | null>(null)

  const originName = useMemo(() => {
    if (!customer?.originId) return "Não informado"
    return origins.find((o) => o.id === customer.originId)?.name ?? "Não informado"
  }, [customer?.originId, origins])

  const hasAddress =
    !!customer &&
    (customer.address ||
      customer.number ||
      customer.addressLine2 ||
      customer.city ||
      customer.state ||
      customer.postalCode ||
      customer.country)

  async function handleSubmit(values: CustomerFormValues) {
    if (!customer) return
    const body = {
      name: values.name,
      email: values.email || null,
      phone: values.phone || null,
      gender: values.gender ? (values.gender as Gender) : null,
      birthDate: values.birthDate || null,
      address: values.address || null,
      addressLine2: values.addressLine2 || null,
      number: values.number,
      city: values.city || null,
      state: values.state || null,
      postalCode: values.postalCode || null,
      country: values.country || null,
      originId: values.originId || null,
      notes: values.notes || null,
    }
    await updateCustomer(customer.id, body)
  }

  if (!routerReady || loading) {
    return (
      <div className="space-y-6">
        <BackLink orgSlug={orgSlug} />
        <div className="flex items-center justify-center py-16 text-foreground/30">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="space-y-4">
        <BackLink orgSlug={orgSlug} />
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          Cliente não encontrado.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <BackLink orgSlug={orgSlug} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-xl font-semibold text-foreground">
              {customer.name}
            </h1>
            <StatusBadge enabled={customer.enabled} />
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:shrink-0 sm:flex-row">
          {canSendAnamnesisInvite && (
            <Button
              variant="outline"
              onClick={() => setAnamnesisDialogOpen(true)}
              className="w-full sm:w-auto"
            >
              <FileHeart className="h-4 w-4" /> Enviar ficha de anamnese
            </Button>
          )}
          <Button onClick={() => setFormOpen(true)} className="w-full sm:w-auto">
            <Pencil className="h-4 w-4" /> Editar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SummaryCard
          label="Serviços realizados"
          value={servicesError ? "—" : String(services.length)}
          loading={servicesLoading}
        />
        <SummaryCard
          label="Transações"
          value={transactionsError ? "—" : String(transactions.length)}
          loading={transactionsLoading}
        />
      </div>

      <div className="space-y-4 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Nome" value={customer.name} />
          <Field label="E-mail" value={customer.email || "—"} />
          <Field label="Telefone" value={customer.phone ?? "—"} />
          <Field
            label="Data de nascimento"
            value={customer.birthDate ? fmtBirthDate(customer.birthDate) : "—"}
          />
          <Field
            label="Gênero"
            value={customer.gender ? GENDER_LABELS[customer.gender] : "—"}
          />
        </div>

        <Separator className="bg-foreground/[0.06]" />

        {hasAddress ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Logradouro" value={customer.address || "—"} />
              <Field label="Número" value={customer.number || "—"} />
            </div>
            {customer.addressLine2 && (
              <Field label="Complemento" value={customer.addressLine2} />
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cidade" value={customer.city || "—"} />
              <Field label="Estado" value={customer.state || "—"} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="CEP" value={customer.postalCode ?? "—"} />
              <Field label="País" value={customer.country ?? "—"} />
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground/40">Endereço não informado</p>
        )}

        <Separator className="bg-foreground/[0.06]" />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Origem" value={originName} />
        </div>
        {customer.notes && (
          <div>
            <p className="text-xs text-foreground/40">Observações</p>
            <p className="whitespace-pre-wrap text-sm text-foreground">
              {customer.notes}
            </p>
          </div>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">Anexos</h2>
        <AttachmentsSection orgId={orgId} customerId={customer.id} />
      </section>

      {canSendAnamnesisInvite && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-foreground">
            Fichas de anamnese
          </h2>
          {anamnesisResponsesError ? (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
              {anamnesisResponsesError}
            </div>
          ) : anamnesisResponsesLoading ? (
            <SectionSkeleton />
          ) : (
            <CustomerAnamnesisList
              responses={anamnesisResponses}
              onSelect={(response) =>
                setSelectedAnamnesisResponseId(response.id)
              }
            />
          )}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">Serviços</h2>
        {servicesError ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            {servicesError}
          </div>
        ) : servicesLoading ? (
          <SectionSkeleton />
        ) : (
          <CustomerServiceHistoryList
            services={services}
            onSelect={(service: Service) => setSelectedServiceId(service.id)}
          />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">Transações</h2>
        {transactionsError ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            {transactionsError}
          </div>
        ) : transactionsLoading ? (
          <SectionSkeleton />
        ) : (
          <CustomerTransactionHistoryList transactions={transactions} />
        )}
      </section>

      <CustomerForm
        open={formOpen}
        onOpenChange={setFormOpen}
        orgId={orgId}
        customer={customer}
        origins={origins}
        onSubmit={handleSubmit}
      />

      {canSendAnamnesisInvite && (
        <SendAnamnesisInviteDialog
          open={anamnesisDialogOpen}
          onOpenChange={setAnamnesisDialogOpen}
          orgId={orgId}
          customerId={customer.id}
          customerName={customer.name}
        />
      )}

      <AnamnesisResponseViewer
        open={!!selectedAnamnesisResponseId}
        onOpenChange={(next) => {
          if (!next) setSelectedAnamnesisResponseId(null)
        }}
        orgId={orgId}
        responseId={selectedAnamnesisResponseId ?? undefined}
      />

      <ServiceDetailSheet
        open={!!selectedServiceId}
        onOpenChange={(next) => {
          if (!next) setSelectedServiceId(null)
        }}
        orgId={orgId}
        serviceId={selectedServiceId ?? undefined}
      />
    </div>
  )
}

function BackLink({ orgSlug }: { orgSlug: string }) {
  return (
    <Link
      href={`/dashboard/org/${orgSlug}/clients`}
      className="inline-flex items-center gap-1.5 text-sm text-foreground/50 transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> Clientes
    </Link>
  )
}

function SummaryCard({
  label,
  value,
  loading,
}: {
  label: string
  value: string
  loading?: boolean
}) {
  return (
    <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4">
      <span className="text-xs text-foreground/40">{label}</span>
      {loading ? (
        <div className="mt-2 h-7 w-12 animate-pulse rounded bg-foreground/[0.06]" />
      ) : (
        <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
          {value}
        </p>
      )}
    </div>
  )
}

function SectionSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-xl border border-foreground/[0.06] bg-foreground/[0.02]"
        />
      ))}
    </div>
  )
}
