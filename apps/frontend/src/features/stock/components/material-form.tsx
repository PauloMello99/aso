"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { materialSchema, type MaterialFormValues } from "../schemas/stock.schemas"
import type { Material } from "../types"

interface MaterialFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  material?: Material | null
  onSubmit: (values: MaterialFormValues) => Promise<void>
}

export function MaterialForm({
  open,
  onOpenChange,
  material,
  onSubmit,
}: MaterialFormProps) {
  const isEditing = !!material

  const form = useForm<MaterialFormValues>({
    resolver: zodResolver(materialSchema),
    defaultValues: { name: "", unit: "", minimumQuantity: "", costPerUnit: "" },
  })

  useEffect(() => {
    if (open) {
      form.reset(
        material
          ? {
              name: material.name,
              unit: material.unit ?? "",
              minimumQuantity:
                material.minimumQuantity === "0.00" ? "" : (material.minimumQuantity ?? ""),
              costPerUnit: material.costPerUnit ?? "",
            }
          : { name: "", unit: "", minimumQuantity: "", costPerUnit: "" },
      )
    }
  }, [open, material, form])

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values)
    onOpenChange(false)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar material" : "Novo material"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize os dados do material."
              : "Adicione um material ao estoque da sua organização."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Nome <span className="text-red-400">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Tinta preta, Agulha 3RL" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidade</FormLabel>
                    <FormControl>
                      <Input placeholder="ml, g, un, pcs" autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="minimumQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Qtd. mínima</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 5" inputMode="decimal" autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="costPerUnit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Custo por unidade{" "}
                    <span className="text-xs text-white/30">(opcional)</span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-white/40">
                        R$
                      </span>
                      <Input
                        placeholder="0.00"
                        inputMode="decimal"
                        autoComplete="off"
                        className="pl-9"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter showCloseButton>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="w-full sm:w-auto"
              >
                {form.formState.isSubmitting
                  ? "Salvando…"
                  : isEditing
                    ? "Salvar alterações"
                    : "Criar material"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
