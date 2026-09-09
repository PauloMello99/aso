"use client"

import { useState } from "react"
import { Controller, useFieldArray, useFormContext } from "react-hook-form"
import { Plus, X } from "lucide-react"
import { AsyncCombobox } from "@/shared/components/ui/async-combobox"
import { Input } from "@/shared/components/ui/input"
import { Switch } from "@/shared/components/ui/switch"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value"
import { useMaterialOptions } from "@/features/stock/hooks/use-material-options"
import { MaterialForm } from "@/features/stock/components/material-form"
import type { MaterialFormValues } from "@/features/stock/schemas/stock.schemas"
import type { Material } from "@/features/stock/types"
import type { ServiceFormValues } from "../schemas/services.schemas"

interface MaterialLinesProps {
  orgId: string
  serviceTypeId?: string
  onCreateMaterial: (values: MaterialFormValues) => Promise<Material>
}

export function MaterialLines({
  orgId,
  serviceTypeId,
  onCreateMaterial,
}: MaterialLinesProps) {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<ServiceFormValues>()
  const { fields, append, remove } = useFieldArray({
    control,
    name: "materials",
  })
  const [materialFormOpen, setMaterialFormOpen] = useState(false)
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search, 250)
  const {
    options: materialOptions,
    truncated,
    loading,
    isFetching,
    error,
    refetch: refetchMaterialOptions,
  } = useMaterialOptions(orgId, { q: debouncedSearch, serviceTypeId })

  function appendMaterial(mat: Material) {
    append({
      materialId: mat.id,
      shareable: mat.shareable,
      quantity: mat.shareable ? "" : "1",
      finished: false,
      // Snapshot para exibir a linha sem depender de uma lista completa —
      // ver comentário no schema (serviceMaterialLineSchema).
      name: mat.name,
      stockQuantity: mat.stockQuantity,
    })
  }

  const usedIds = new Set(fields.map((f) => f.materialId))
  const available = materialOptions.filter((m) => !usedIds.has(m.id))

  function addMaterial(materialId: string) {
    const mat = materialOptions.find((m) => m.id === materialId)
    if (!mat) return
    appendMaterial(mat)
    setSearch("")
  }

  return (
    <div className="flex flex-col gap-3">
      {fields.length === 0 && (
        <p className="text-xs text-foreground/30">
          Adicione ao menos um material consumido.
        </p>
      )}

      {fields.map((field, index) => {
        const rowError =
          errors.materials?.[index]?.materialId?.message ??
          errors.materials?.[index]?.quantity?.message
        return (
          <div
            key={field.id}
            className={cn(
              "flex flex-col gap-1.5 rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] p-2.5",
              rowError && "border-destructive",
            )}
          >
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">
                  {field.name ?? "Material"}
                </p>
                {field.shareable ? (
                  <Controller
                    control={control}
                    name={`materials.${index}.finished`}
                    render={({ field: f }) => (
                      <label className="mt-1 flex items-center gap-2 text-xs text-foreground/50">
                        <Switch
                          checked={!!f.value}
                          onCheckedChange={f.onChange}
                        />
                        Acabou? (baixa 1 unidade)
                      </label>
                    )}
                  />
                ) : (
                  <p className="mt-0.5 text-xs text-foreground/30">
                    Em estoque: {field.stockQuantity ?? "—"}
                  </p>
                )}
              </div>

              {!field.shareable && (
                <Input
                  inputMode="numeric"
                  autoComplete="off"
                  className="w-24"
                  aria-label="Quantidade"
                  {...register(`materials.${index}.quantity`)}
                />
              )}

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => remove(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {rowError && (
              <p className="text-xs text-destructive">{rowError}</p>
            )}
          </div>
        )
      })}

      <AsyncCombobox
        value=""
        onValueChange={addMaterial}
        options={available}
        selectedOption={undefined}
        loading={loading}
        isFetching={isFetching}
        truncated={truncated}
        error={error}
        onRetry={refetchMaterialOptions}
        search={search}
        onSearchChange={setSearch}
        getOptionId={(m) => m.id}
        getOptionLabel={(m) => `${m.name}${m.shareable ? " (compartilhável)" : ""}`}
        placeholder="Adicionar material"
        searchPlaceholder="Buscar material…"
        emptyLabel="Nenhum material disponível."
        footer={
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setMaterialFormOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Criar material
          </Button>
        }
      />

      <MaterialForm
        open={materialFormOpen}
        onOpenChange={setMaterialFormOpen}
        orgId={orgId}
        onSubmit={async (values) => {
          const created = await onCreateMaterial(values)
          appendMaterial(created)
        }}
      />
    </div>
  )
}
