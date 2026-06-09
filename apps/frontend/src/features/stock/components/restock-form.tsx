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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"
import { restockSchema, type RestockFormValues } from "../schemas/stock.schemas"
import type { Material } from "../types"

interface RestockFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  material: Material | null
  onSubmit: (values: RestockFormValues) => Promise<void>
}

export function RestockForm({
  open,
  onOpenChange,
  material,
  onSubmit,
}: RestockFormProps) {
  const form = useForm<RestockFormValues>({
    resolver: zodResolver(restockSchema),
    defaultValues: { quantity: "", note: "" },
  })

  useEffect(() => {
    if (open) form.reset({ quantity: "", note: "" })
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
          <DialogTitle>Repor estoque</DialogTitle>
          <DialogDescription>
            {material ? (
              <>
                Adicionar quantidade a{" "}
                <span className="font-medium text-white">{material.name}</span>.
                Estoque atual:{" "}
                <span className="font-medium text-white">
                  {parseFloat(material.stockQuantity).toLocaleString("pt-BR")}
                  {unitLabel}
                </span>
              </>
            ) : (
              "Adicionar quantidade ao material."
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Quantidade a adicionar{unitLabel}{" "}
                    <span className="text-red-400">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: 100"
                      inputMode="decimal"
                      autoComplete="off"
                      autoFocus
                      {...field}
                    />
                  </FormControl>
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
                    Observação{" "}
                    <span className="text-xs text-white/30">(opcional)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ex: Compra 10/06 — NF 12345"
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
                {form.formState.isSubmitting ? "Salvando…" : "Repor estoque"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
