"use client"

import { useState } from "react"
import { Loader2, Pencil, Plus, ShieldAlert } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { AnamnesisFormBuilder } from "@/features/anamnesis"
import { useServiceTypes } from "../hooks/use-service-types"
import { ServiceTypeDialog } from "./service-type-dialog"
import { EditServiceTypeDialog } from "./edit-service-type-dialog"

interface ServiceTypesSettingsPageProps {
  orgId: string
}

export function ServiceTypesSettingsPage({
  orgId,
}: ServiceTypesSettingsPageProps) {
  const { serviceTypes, loading, createServiceType, updateServiceType } =
    useServiceTypes(orgId)
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-foreground/40">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando tipos de serviço…
      </div>
    )
  }

  const selectedType =
    serviceTypes.find((type) => type.id === selectedTypeId) ?? null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {serviceTypes.length > 0 && (
          <Select
            value={selectedTypeId ?? undefined}
            onValueChange={(value) => setSelectedTypeId(value)}
          >
            <SelectTrigger className="sm:max-w-xs">
              <SelectValue placeholder="Selecione um tipo de serviço" />
            </SelectTrigger>
            <SelectContent>
              {serviceTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                  {type.requiresAgeVerification ? " (18+)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="mr-1 h-4 w-4" />
            Novo tipo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={!selectedType}
            onClick={() => setEditDialogOpen(true)}
            aria-label="Editar tipo de serviço"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {selectedType?.requiresAgeVerification && (
            <span className="flex items-center gap-1 text-xs text-warning">
              <ShieldAlert className="h-3.5 w-3.5" />
              Requer 18+
            </span>
          )}
        </div>
      </div>

      {serviceTypes.length === 0 && (
        <p className="rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] p-4 text-sm text-foreground/40">
          Nenhum tipo de serviço cadastrado ainda. Use o botão &quot;Novo
          tipo&quot; acima para criar o primeiro e configurar sua ficha de
          anamnese.
        </p>
      )}

      {selectedTypeId ? (
        <AnamnesisFormBuilder
          key={selectedTypeId}
          orgId={orgId}
          serviceTypeId={selectedTypeId}
        />
      ) : (
        serviceTypes.length > 0 && (
          <p className="rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] p-4 text-sm text-foreground/40">
            Selecione um tipo de serviço acima para configurar sua ficha de
            anamnese.
          </p>
        )
      )}

      <ServiceTypeDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreate={createServiceType}
        onCreated={(type) => setSelectedTypeId(type.id)}
      />

      {selectedType && (
        <EditServiceTypeDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          serviceType={selectedType}
          onSave={updateServiceType}
        />
      )}
    </div>
  )
}
