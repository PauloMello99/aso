"use client"

import { useState } from "react"
import { FileHeart, Loader2 } from "lucide-react"
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet"
import { Button } from "@/shared/components/ui/button"
import { formatBRL } from "@/features/cashier/lib/money"
import { AnamnesisResponseViewer } from "@/features/anamnesis"
import { useService } from "../hooks/use-service"
import { formatDate, StatusBadge } from "./service-list"
import { ServiceMediaSection } from "./service-media-section"
import {
  serviceStatus,
  SERVICE_PAYMENT_METHOD_LABELS,
  type Service,
} from "../types"

interface ServiceDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string
  serviceId: string | undefined
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-foreground/40">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  )
}

function ServiceDetailContent({
  orgId,
  service,
  onViewAnamnesis,
}: {
  orgId: string
  service: Service
  onViewAnamnesis: () => void
}) {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/40">
          Dados
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Cliente" value={service.customerName ?? "—"} />
          <Field label="Tipo de serviço" value={service.typeName ?? "—"} />
          <Field label="Profissional" value={service.employeeName ?? "—"} />
          <Field
            label="Data de execução"
            value={formatDate(service.performedAt)}
          />
        </div>
        {service.description && (
          <Field label="Descrição" value={service.description} />
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/40">
          Materiais consumidos
        </h3>
        {service.materials.length === 0 ? (
          <p className="text-xs text-foreground/30">
            Nenhum material registrado.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {service.materials.map((line) => (
              <li
                key={line.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] px-3 py-2 text-sm"
              >
                <span className="text-foreground">
                  {line.materialName ?? "—"}
                </span>
                <span className="tabular-nums text-foreground/50">
                  {line.quantity}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/40">
          Pagamento
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Valor" value={formatBRL(service.amountCents)} />
          <Field
            label="Método de pagamento"
            value={SERVICE_PAYMENT_METHOD_LABELS[service.paymentMethod]}
          />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/40">
          Fotos
        </h3>
        <ServiceMediaSection orgId={orgId} serviceId={service.id} readOnly />
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/40">
          Ficha de anamnese
        </h3>
        {service.anamnesisResponseId ? (
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={onViewAnamnesis}
          >
            <FileHeart className="h-4 w-4" />
            Ver ficha de anamnese
          </Button>
        ) : (
          <p className="text-xs text-foreground/30">
            Nenhuma ficha de anamnese vinculada a este serviço.
          </p>
        )}
      </section>
    </div>
  )
}

export function ServiceDetailSheet({
  open,
  onOpenChange,
  orgId,
  serviceId,
}: ServiceDetailSheetProps) {
  const { service, loading, error } = useService(orgId, serviceId)
  const [anamnesisViewerOpen, setAnamnesisViewerOpen] = useState(false)

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gap-0 sm:max-w-2xl">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <SheetTitle>{service?.customerName ?? "Serviço"}</SheetTitle>
            {service && <StatusBadge status={serviceStatus(service)} />}
          </div>
          <SheetDescription>
            {service?.typeName ?? "Detalhes do atendimento"}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="flex flex-col gap-6 py-6">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-foreground/30">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : error || !service ? (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
              Não foi possível carregar os detalhes do serviço.
            </div>
          ) : (
            <ServiceDetailContent
              orgId={orgId}
              service={service}
              onViewAnamnesis={() => setAnamnesisViewerOpen(true)}
            />
          )}
        </SheetBody>

        <SheetFooter>
          <SheetClose asChild>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
            >
              Fechar
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>

      <AnamnesisResponseViewer
        open={anamnesisViewerOpen}
        onOpenChange={setAnamnesisViewerOpen}
        orgId={orgId}
        responseId={service?.anamnesisResponseId ?? undefined}
      />
    </>
  )
}
