"use client"

import { useState } from "react"
import { Controller, useFieldArray, useFormContext } from "react-hook-form"
import { Plus, X } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { Input } from "@/shared/components/ui/input"
import { Switch } from "@/shared/components/ui/switch"
import { Button } from "@/shared/components/ui/button"
import { MaterialForm } from "@/features/stock/components/material-form"
import type { MaterialFormValues } from "@/features/stock/schemas/stock.schemas"
import type { Material } from "@/features/stock/types"
import type { ServiceFormValues } from "../schemas/services.schemas"

interface MaterialLinesProps {
  materials: Material[]
  /** Item 5 — cria um material (modal reusa o MaterialForm) e o adiciona à linha. */
  onCreateMaterial: (values: MaterialFormValues) => Promise<Material>
}

export function MaterialLines({
  materials,
  onCreateMaterial,
}: MaterialLinesProps) {
  const { control, register } = useFormContext<ServiceFormValues>()
  const { fields, append, remove } = useFieldArray({
    control,
    name: "materials",
  })
  const [materialFormOpen, setMaterialFormOpen] = useState(false)

  function appendMaterial(mat: Material) {
    append({
      materialId: mat.id,
      shareable: mat.shareable,
      quantity: mat.shareable ? "" : "1",
      finished: false,
    })
  }

  const usedIds = new Set(fields.map((f) => f.materialId))
  const available = materials.filter((m) => !usedIds.has(m.id))

  function addMaterial(materialId: string) {
    const mat = materials.find((m) => m.id === materialId)
    if (!mat) return
    appendMaterial(mat)
  }

  return (
    <div className="flex flex-col gap-3">
      {fields.length === 0 && (
        <p className="text-xs text-foreground/30">
          Adicione ao menos um material consumido.
        </p>
      )}

      {fields.map((field, index) => {
        const mat = materials.find((m) => m.id === field.materialId)
        return (
          <div
            key={field.id}
            className="flex items-center gap-2 rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] p-2.5"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-foreground">
                {mat?.name ?? "Material"}
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
                  Em estoque: {mat?.stockQuantity ?? "—"}
                </p>
              )}
            </div>

            {!field.shareable && (
              <Input
                type="number"
                step="0.01"
                min="0"
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
        )
      })}

      <div className="flex gap-2">
        {available.length > 0 && (
          <Select value="" onValueChange={addMaterial}>
            <SelectTrigger className="w-full">
              <span className="flex items-center gap-2 text-foreground/60">
                <Plus className="h-4 w-4" />
                <SelectValue placeholder="Adicionar material" />
              </span>
            </SelectTrigger>
            <SelectContent>
              {available.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                  {m.shareable ? " (compartilhável)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          onClick={() => setMaterialFormOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Criar material
        </Button>
      </div>

      {/* Item 5 — cria um material reusando o MaterialForm e já o adiciona. */}
      <MaterialForm
        open={materialFormOpen}
        onOpenChange={setMaterialFormOpen}
        onSubmit={async (values) => {
          const created = await onCreateMaterial(values)
          appendMaterial(created)
        }}
      />
    </div>
  )
}
