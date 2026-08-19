"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, User } from "lucide-react"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { useMemberCommissions } from "../hooks/use-member-commissions"
import {
  commissionsSchema,
  type CommissionsFormValues,
} from "../schemas/cashier.schemas"
import { COMMISSION_MODE_LABELS } from "../types"

interface MemberCommissionsFormProps {
  orgId: string
}

export function MemberCommissionsForm({ orgId }: MemberCommissionsFormProps) {
  const { commissions, loading, error: loadError, upsertCommissions } =
    useMemberCommissions(orgId)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<CommissionsFormValues>({
    resolver: zodResolver(commissionsSchema),
    defaultValues: { commissions: [] },
  })

  useEffect(() => {
    form.reset({
      commissions: commissions.map((c) => ({
        userId: c.userId,
        percent: c.configured ? c.percent : "",
        mode: c.mode ?? "gross",
      })),
    })
  }, [commissions, form])

  const handleSubmit = form.handleSubmit(async (values) => {
    setError(null)
    setSaved(false)
    try {
      await upsertCommissions(
        values.commissions.map((c) => ({
          userId: c.userId,
          percent: (c.percent || "0").replace(",", "."),
          mode: c.mode,
        })),
      )
      setSaved(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar as comissões.",
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
          O repasse por profissional é apenas informativo: o sistema não
          movimenta dinheiro, só calcula e exibe o valor de referência a
          repassar. No modo <strong>bruto</strong>, o estúdio absorve a taxa
          do cartão; no modo <strong>líquido</strong>, a taxa é dividida
          proporcionalmente com o profissional. O percentual salvo vale para
          os serviços registrados a partir de agora — lançamentos anteriores
          mantêm o percentual que estava vigente na época.
        </p>

        {loadError && (
          <p className="text-sm text-destructive">{loadError}</p>
        )}

        {commissions.length === 0 ? (
          <p className="rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] p-4 text-sm text-foreground/50">
            {loadError
              ? "Não foi possível carregar os profissionais."
              : "Nenhum profissional ativo nesta organização."}
          </p>
        ) : (
          commissions.map((member, idx) => (
            <div
              key={member.userId}
              className="rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] p-4"
            >
              <div className="mb-3 flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium text-foreground">
                  {member.name}
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name={`commissions.${idx}.percent`}
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
                  name={`commissions.${idx}.mode`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base de cálculo</FormLabel>
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
                          <SelectItem value="gross">
                            {COMMISSION_MODE_LABELS.gross}
                          </SelectItem>
                          <SelectItem value="net">
                            {COMMISSION_MODE_LABELS.net}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          ))
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
        {saved && <p className="text-sm text-success">Comissões salvas.</p>}

        {commissions.length > 0 && (
          <div>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Salvando…" : "Salvar comissões"}
            </Button>
          </div>
        )}
      </form>
    </Form>
  )
}
