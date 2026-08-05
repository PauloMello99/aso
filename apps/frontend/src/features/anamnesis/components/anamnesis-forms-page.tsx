"use client";

import { useState } from "react";
import { Loader2, Pencil, Plus, ShieldAlert } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useCurrentOrg } from "@/features/dashboard";
import { useServiceTypes } from "@/features/services/hooks/use-service-types";
import { ServiceTypeDialog } from "@/features/services/components/service-type-dialog";
import { EditServiceTypeDialog } from "@/features/services/components/edit-service-type-dialog";
import { useAnamnesisForm } from "../hooks/use-anamnesis-form";
import { AnamnesisFormBuilder } from "./anamnesis-form-builder";
import { AnamnesisVersionHistory } from "./anamnesis-version-history";

interface AnamnesisFormsPageProps {
  orgId: string;
}

export function AnamnesisFormsPage({ orgId }: AnamnesisFormsPageProps) {
  const { org } = useCurrentOrg();
  const isOwner = org.role === "owner";

  const { serviceTypes, loading, createServiceType, updateServiceType } =
    useServiceTypes(orgId);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);

  // Derivada, não useEffect: evita o flash de estado vazio no primeiro load e
  // não depende de ordem de efeitos.
  const effectiveTypeId = selectedTypeId ?? serviceTypes[0]?.id ?? null;
  const selectedType =
    serviceTypes.find((type) => type.id === effectiveTypeId) ?? null;

  const { versions, versionsLoading } = useAnamnesisForm(
    orgId,
    effectiveTypeId ?? "",
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Anamnese</h1>
        <p className="mt-0.5 text-sm text-foreground/40">
          Fichas de anamnese versionadas por tipo de serviço.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-foreground/40">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Carregando tipos de serviço…
        </div>
      ) : serviceTypes.length === 0 ? (
        <p className="rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] p-4 text-sm text-foreground/40">
          {isOwner ? (
            <>
              Nenhuma categoria cadastrada ainda. Crie a primeira para
              configurar sua ficha de anamnese.
            </>
          ) : (
            "Nenhuma categoria cadastrada ainda."
          )}
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={effectiveTypeId ?? undefined}
              onValueChange={setSelectedTypeId}
            >
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Selecione uma categoria" />
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

            {selectedType?.requiresAgeVerification && (
              <span className="flex items-center gap-1 text-xs text-warning">
                <ShieldAlert className="h-3.5 w-3.5" />
                Requer 18+
              </span>
            )}

            {isOwner && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!effectiveTypeId}
                onClick={() => setEditDialogOpen(true)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {isOwner && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground/40">
                Histórico de versões
              </h2>
              {isOwner && !versionsLoading && effectiveTypeId && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setBuilderOpen(true)}
                >
                  {versions.length === 0 ? "Criar ficha" : "Alterar ficha"}
                </Button>
              )}
            </div>
            <AnamnesisVersionHistory
              versions={versions}
              versionsLoading={versionsLoading}
            />
          </div>
        </div>
      )}

      {isOwner && effectiveTypeId && (
        <AnamnesisFormBuilder
          key={effectiveTypeId}
          orgId={orgId}
          serviceTypeId={effectiveTypeId}
          serviceTypeName={selectedType?.name}
          open={builderOpen}
          onOpenChange={setBuilderOpen}
        />
      )}

      {isOwner && (
        <ServiceTypeDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onCreate={createServiceType}
          onCreated={(type) => setSelectedTypeId(type.id)}
        />
      )}

      {isOwner && selectedType && (
        <EditServiceTypeDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          serviceType={selectedType}
          onSave={updateServiceType}
        />
      )}
    </div>
  );
}
