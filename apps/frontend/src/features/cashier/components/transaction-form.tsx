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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { DatePicker } from "@/shared/components/ui/date-picker"
import {
  transactionSchema,
  type TransactionFormValues,
} from "../schemas/cashier.schemas"
import { formatBRL, parseReaisToCents } from "../lib/money"
import { previewNet } from "../lib/fees"
import {
  PAYMENT_METHOD_LABELS,
  TRANSACTION_TYPE_LABELS,
  type PaymentFee,
  type PaymentMethod,
  type TransactionCategory,
} from "../types"
import type { Member } from "@/features/organizations/types"

const CATEGORY_NONE = "none"
const CREATED_BY_SELF = "self"

const METHOD_ORDER: PaymentMethod[] = [
  "cash",
  "bank_transfer",
  "credit_card",
  "debit_card",
  "credits",
]

interface TransactionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fees: PaymentFee[]
  categories: TransactionCategory[]
  /** Owner pode lançar em nome de um membro; funcionário não vê o seletor. */
  isOwner?: boolean
  members?: Member[]
  onSubmit: (values: TransactionFormValues) => Promise<void>
}

export function TransactionForm({
  open,
  onOpenChange,
  fees,
  categories,
  isOwner = false,
  members = [],
  onSubmit,
}: TransactionFormProps) {
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      description: "",
      type: "income",
      amount: "",
      paymentMethod: "cash",
      categoryId: "",
      createdBy: "",
      transactedAt: "",
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        description: "",
        type: "income",
        amount: "",
        paymentMethod: "cash",
        categoryId: "",
        createdBy: "",
        transactedAt: "",
      })
    }
  }, [open, form])

  const activeMembers = members.filter((m) => m.enabled)

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values)
    onOpenChange(false)
  })

  // Preview do líquido (taxa de cartão) — reativo aos campos.
  const amount = form.watch("amount")
  const method = form.watch("paymentMethod")
  const type = form.watch("type")
  const grossCents = amount ? parseReaisToCents(amount) : Number.NaN
  const preview =
    !Number.isNaN(grossCents) && grossCents > 0
      ? previewNet(grossCents, method, type, fees)
      : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gap-0 sm:max-w-md">
        <Form {...form}>
          <form onSubmit={handleSubmit} className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle>Novo lançamento</SheetTitle>
              <SheetDescription>
                Registre uma entrada ou saída no caixa.
              </SheetDescription>
            </SheetHeader>

            <SheetBody className="flex flex-col gap-4 py-6">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="income">
                          {TRANSACTION_TYPE_LABELS.income}
                        </SelectItem>
                        <SelectItem value="outcome">
                          {TRANSACTION_TYPE_LABELS.outcome}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Descrição <span className="text-red-400">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex.: Tatuagem braço, Compra de tinta"
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Valor <span className="text-red-400">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-white/40">
                          R$
                        </span>
                        <Input
                          placeholder="0,00"
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

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Método de pagamento</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {METHOD_ORDER.map((m) => (
                          <SelectItem key={m} value={m}>
                            {PAYMENT_METHOD_LABELS[m]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Categoria{" "}
                      <span className="text-xs text-white/30">(opcional)</span>
                    </FormLabel>
                    <Select
                      value={field.value || CATEGORY_NONE}
                      onValueChange={(v) =>
                        field.onChange(v === CATEGORY_NONE ? "" : v)
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sem categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={CATEGORY_NONE}>Sem categoria</SelectItem>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Owner: lançar em nome de um membro (funcionário força = self). */}
              {isOwner && (
                <FormField
                  control={form.control}
                  name="createdBy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Em nome de{" "}
                        <span className="text-xs text-white/30">(opcional)</span>
                      </FormLabel>
                      <Select
                        value={field.value || CREATED_BY_SELF}
                        onValueChange={(v) =>
                          field.onChange(v === CREATED_BY_SELF ? "" : v)
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Eu mesmo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={CREATED_BY_SELF}>Eu mesmo</SelectItem>
                          {activeMembers.map((m) => (
                            <SelectItem key={m.userId} value={m.userId}>
                              {m.userName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="transactedAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Data{" "}
                      <span className="text-xs text-white/30">(opcional)</span>
                    </FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Hoje"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Preview de taxa de cartão → líquido no caixa */}
              {preview?.hasFee && (
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-sm">
                  <div className="flex items-center justify-between text-white/50">
                    <span>Taxa estimada</span>
                    <span className="tabular-nums text-red-400">
                      − {formatBRL(preview.feeCents)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between font-medium text-white">
                    <span>Líquido no caixa</span>
                    <span className="tabular-nums">
                      {formatBRL(preview.netCents)}
                    </span>
                  </div>
                </div>
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
                {form.formState.isSubmitting ? "Salvando…" : "Lançar"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
