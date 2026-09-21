"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CreditCard, Loader2 } from "lucide-react"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { usePaymentFees } from "../hooks/use-payment-fees"
import { feesSchema, type FeesFormValues } from "../schemas/cashier.schemas"
import { centsToReaisInput, parseReaisToCents } from "../lib/money"
import { MAX_INSTALLMENTS, PAYMENT_METHOD_LABELS, type PaymentMethod } from "../types"

interface PaymentFeesFormProps {
  orgId: string
}

// Faixas de crédito 1..MAX_INSTALLMENTS (12) + débito fixo em 1x (não
// parcelável — CHECK do banco proíbe installments>1 fora de credit_card).
// Índice de cada entrada em `fees` é a própria posição neste array, usado
// para montar os `name` dos FormField (`fees.${idx}.percent`/`.fixed`).
const CREDIT_CARD_INSTALLMENTS = Array.from(
  { length: MAX_INSTALLMENTS },
  (_, i) => i + 1,
)

interface FeeEntry {
  paymentMethod: PaymentMethod
  installments: number
}

const FEE_ENTRIES: FeeEntry[] = [
  ...CREDIT_CARD_INSTALLMENTS.map((installments) => ({
    paymentMethod: "credit_card" as const,
    installments,
  })),
  { paymentMethod: "debit_card" as const, installments: 1 },
]

const DEBIT_CARD_INDEX = FEE_ENTRIES.length - 1

export function PaymentFeesForm({ orgId }: PaymentFeesFormProps) {
  const { fees, loading, upsertFees } = usePaymentFees(orgId)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<FeesFormValues>({
    resolver: zodResolver(feesSchema),
    defaultValues: {
      fees: FEE_ENTRIES.map((e) => ({
        paymentMethod: e.paymentMethod,
        installments: e.installments,
        percent: "",
        fixed: "",
      })),
    },
  })

  useEffect(() => {
    form.reset({
      fees: FEE_ENTRIES.map((e) => {
        const existing = fees.find(
          (f) =>
            f.paymentMethod === e.paymentMethod &&
            f.installments === e.installments,
        )
        return {
          paymentMethod: e.paymentMethod,
          installments: e.installments,
          percent: existing && existing.percent !== "0.00" ? existing.percent : "",
          fixed: existing && existing.fixedCents > 0
            ? centsToReaisInput(existing.fixedCents)
            : "",
        }
      }),
    })
  }, [fees, form])

  const handleSubmit = form.handleSubmit(async (values) => {
    setError(null)
    setSaved(false)
    try {
      await upsertFees(
        values.fees.map((f) => ({
          paymentMethod: f.paymentMethod,
          installments: f.installments,
          percent: (f.percent || "0").replace(",", "."),
          fixedCents: f.fixed ? parseReaisToCents(f.fixed) : 0,
        })),
      )
      setSaved(true)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível salvar as taxas.",
      )
    }
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-foreground/40">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando…
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="grid gap-6">
        <p className="text-sm text-foreground/50">
          Ao lançar uma <strong>entrada em cartão</strong>, o sistema desconta a
          taxa e registra o valor líquido no caixa. Líquido = bruto −
          (bruto × percentual + valor fixo). Esta é a taxa padrão da
          organização; cada funcionário pode ter taxas próprias, definidas na
          tela de Membros.
        </p>

        <div className="rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] p-4">
          <div className="mb-3 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium text-foreground">
              {PAYMENT_METHOD_LABELS.credit_card}
            </h3>
          </div>
          <Table className="table-fixed">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[22%] whitespace-normal px-1.5 py-1.5">
                  Parcelas
                </TableHead>
                <TableHead className="w-[39%] whitespace-normal px-1.5 py-1.5">
                  Percentual (%)
                </TableHead>
                <TableHead className="w-[39%] whitespace-normal px-1.5 py-1.5">
                  Valor fixo (R$)
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {CREDIT_CARD_INSTALLMENTS.map((installments, idx) => (
                <TableRow key={installments} className="hover:bg-transparent">
                  <TableCell className="px-1.5 py-1.5 text-xs whitespace-normal text-foreground/60">
                    {installments === 1 ? "1x (à vista)" : `${installments}x`}
                  </TableCell>
                  <TableCell className="px-1.5 py-1.5">
                    <FormField
                      control={form.control}
                      name={`fees.${idx}.percent`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="relative">
                              <Input
                                placeholder="0,00"
                                inputMode="decimal"
                                autoComplete="off"
                                className="pr-5 pl-2 text-xs"
                                {...field}
                              />
                              <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-foreground/40">
                                %
                              </span>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TableCell>
                  <TableCell className="px-1.5 py-1.5">
                    <FormField
                      control={form.control}
                      name={`fees.${idx}.fixed`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-xs text-foreground/40">
                                R$
                              </span>
                              <Input
                                placeholder="0,00"
                                inputMode="decimal"
                                autoComplete="off"
                                className="pr-2 pl-6 text-xs"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] p-4">
          <div className="mb-3 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium text-foreground">
              {PAYMENT_METHOD_LABELS.debit_card}
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name={`fees.${DEBIT_CARD_INDEX}.percent`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Percentual (%)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder="0,00"
                        inputMode="decimal"
                        autoComplete="off"
                        className="pr-7"
                        {...field}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-foreground/40">
                        %
                      </span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`fees.${DEBIT_CARD_INDEX}.fixed`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor fixo</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground/40">
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
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {saved && <p className="text-sm text-success">Taxas salvas.</p>}

        <div>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Salvando…" : "Salvar taxas"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
