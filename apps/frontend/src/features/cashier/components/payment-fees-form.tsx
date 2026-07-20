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
import { usePaymentFees } from "../hooks/use-payment-fees"
import { feesSchema, type FeesFormValues } from "../schemas/cashier.schemas"
import { centsToReaisInput, parseReaisToCents } from "../lib/money"
import { FEE_ELIGIBLE_METHODS, PAYMENT_METHOD_LABELS } from "../types"

interface PaymentFeesFormProps {
  orgId: string
}

export function PaymentFeesForm({ orgId }: PaymentFeesFormProps) {
  const { fees, loading, upsertFees } = usePaymentFees(orgId)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<FeesFormValues>({
    resolver: zodResolver(feesSchema),
    defaultValues: {
      fees: FEE_ELIGIBLE_METHODS.map((m) => ({
        paymentMethod: m,
        percent: "",
        fixed: "",
      })),
    },
  })

  useEffect(() => {
    form.reset({
      fees: FEE_ELIGIBLE_METHODS.map((m) => {
        const existing = fees.find((f) => f.paymentMethod === m)
        return {
          paymentMethod: m,
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
      <form onSubmit={handleSubmit} className="grid max-w-lg gap-6">
        <p className="text-sm text-foreground/50">
          Ao lançar uma <strong>entrada em cartão</strong>, o sistema desconta a
          taxa e registra o valor líquido no caixa. Líquido = bruto −
          (bruto × percentual + valor fixo).
        </p>

        {FEE_ELIGIBLE_METHODS.map((method, idx) => (
          <div
            key={method}
            className="rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] p-4"
          >
            <div className="mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium text-foreground">
                {PAYMENT_METHOD_LABELS[method]}
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name={`fees.${idx}.percent`}
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
                name={`fees.${idx}.fixed`}
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
        ))}

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
