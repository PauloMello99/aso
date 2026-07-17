"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { AnamnesisFormBuilder } from "@/features/anamnesis"
import { useServiceTypes } from "../hooks/use-service-types"

interface ServiceTypesSettingsPageProps {
  orgId: string
}

/**
 * Lista os tipos de serviço da org e permite configurar a ficha de anamnese
 * do tipo selecionado. CRUD completo de tipos de serviço é fora de escopo
 * aqui — tipos são criados inline ao lançar um serviço (ver ServiceTypeDialog).
 */
export function ServiceTypesSettingsPage({
  orgId,
}: ServiceTypesSettingsPageProps) {
  const { serviceTypes, loading } = useServiceTypes(orgId)
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-foreground/40">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando tipos de serviço…
      </div>
    )
  }

  if (serviceTypes.length === 0) {
    return (
      <p className="rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] p-4 text-sm text-foreground/40">
        Nenhum tipo de serviço cadastrado ainda. Tipos são criados ao lançar
        um serviço em Serviços — depois disso, volte aqui para configurar a
        ficha de anamnese de cada um.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {serviceTypes.map((type) => (
          <button
            key={type.id}
            type="button"
            onClick={() => setSelectedTypeId(type.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition-colors",
              selectedTypeId === type.id
                ? "border-orange-400/40 bg-orange-400/10 text-foreground"
                : "border-foreground/[0.08] text-foreground/60 hover:bg-foreground/[0.04]",
            )}
          >
            {type.name}
          </button>
        ))}
      </div>

      {selectedTypeId ? (
        <AnamnesisFormBuilder
          key={selectedTypeId}
          orgId={orgId}
          serviceTypeId={selectedTypeId}
        />
      ) : (
        <p className="rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] p-4 text-sm text-foreground/40">
          Selecione um tipo de serviço acima para configurar sua ficha de
          anamnese.
        </p>
      )}
    </div>
  )
}
