"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
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
import {
  transactionCategorySchema,
  type TransactionCategoryFormValues,
} from "../schemas/cashier.schemas"
import { categoryErrorMessage } from "../lib/error-messages"
import type { TransactionCategory } from "../types"

interface TransactionCategorySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: TransactionCategory | null
  onCreate: (name: string) => Promise<TransactionCategory>
  onUpdate: (id: string, name: string) => Promise<TransactionCategory>
}

export function TransactionCategorySheet({
  open,
  onOpenChange,
  category,
  onCreate,
  onUpdate,
}: TransactionCategorySheetProps) {
  const isEdit = category !== null

  const form = useForm<TransactionCategoryFormValues>({
    resolver: zodResolver(transactionCategorySchema),
    defaultValues: { name: "" },
  })

  useEffect(() => {
    if (open) {
      form.reset({ name: category?.name ?? "" })
    }
  }, [open, category, form])

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      if (isEdit) {
        await onUpdate(category.id, values.name)
      } else {
        await onCreate(values.name)
      }
      onOpenChange(false)
    } catch (err) {
      form.setError("root", { message: categoryErrorMessage(err) })
    }
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gap-0 sm:max-w-md">
        <Form {...form}>
          <form onSubmit={handleSubmit} className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle>
                {isEdit ? "Renomear categoria" : "Nova categoria"}
              </SheetTitle>
              <SheetDescription>
                Categorias classificam entradas e saídas do caixa.
              </SheetDescription>
            </SheetHeader>

            <SheetBody className="flex flex-col gap-4 py-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Nome <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex.: Aluguel, Materiais"
                        autoComplete="off"
                        autoFocus
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.formState.errors.root && (
                <p
                  role="alert"
                  className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {form.formState.errors.root.message}
                </p>
              )}
            </SheetBody>

            <SheetFooter>
              <SheetClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  Cancelar
                </Button>
              </SheetClose>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="w-full sm:w-auto"
              >
                {form.formState.isSubmitting ? "Salvando…" : "Salvar"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
