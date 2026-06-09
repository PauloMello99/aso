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
import { Textarea } from "@/shared/components/ui/textarea"
import { adjustStockSchema, type AdjustStockFormValues } from "../schemas/stock.schemas"
import type { Material } from "../types"

interface AdjustStockFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  material: Material | null
  onSubmit: (values: AdjustStockFormValues) => Promise<void>
}

export function AdjustStockForm({
  open,
  onOpenChange,
  material,
  onSubmit,
}: AdjustStockFormProps) {
  const form = useForm<AdjustStockFormValues>({
    resolver: zodResolver(adjustStockSchema),
    defaultValues: { quantityDelta: "", note: "" },
  })

  useEffect(() => {
    if (open) form.reset({ quantityDelta: "", note: "" })
  }, [open, form])

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values)
    onOpenChange(false)
  })

  const unitLabel = material?.unit ? ` (${material.unit})` : ""

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar estoque</DialogTitle>
          <DialogDescription>
            {material ? (
              <>
                Corrija a quantidade de{" "}
                <span className="font-medium text-white">{material.name}</span>.
                Estoque atual:{" "}
                <span className="font-medium text-white">
                  {parseFloat(material.stockQuantity).toLocaleString("pt-BR")}
                  {unitLabel}
                </span>
              </>
            ) : (
              "Ajuste manual do estoque — perdas, correções ou descarte."
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <FormField
              control={form.control}
              name="quantityDelta"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Delta{unitLabel} <span className="text-red-400">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: -5 (perda) ou 10 (entrada)"
                      inputMode="decimal"
                      autoComplete="off"
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Use número negativo para remover estoque (ex: -5) e positivo
                    para adicionar (ex: 10).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Motivo{" "}
                    <span className="text-xs text-white/30">(recomendado)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ex: Descarte por validade expirada"
                      rows={2}
                      {...field}
                    />
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
                {form.formState.isSubmitting ? "Salvando…" : "Aplicar ajuste"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
