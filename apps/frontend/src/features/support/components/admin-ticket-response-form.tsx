"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/shared/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form"
import { Switch } from "@/shared/components/ui/switch"
import { Textarea } from "@/shared/components/ui/textarea"
import {
  addAgentResponseSchema,
  type AddAgentResponseFormValues,
} from "../schemas/ticket.schema"

interface AdminTicketResponseFormProps {
  onSubmitResponse: (body: string, isInternalNote: boolean) => Promise<unknown>
  submitting: boolean
}

const EMPTY: AddAgentResponseFormValues = { body: "", isInternalNote: false }

export function AdminTicketResponseForm({
  onSubmitResponse,
  submitting,
}: AdminTicketResponseFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<AddAgentResponseFormValues>({
    resolver: zodResolver(addAgentResponseSchema),
    defaultValues: EMPTY,
  })

  const handleSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null)
    try {
      await onSubmitResponse(values.body, values.isInternalNote)
      form.reset(EMPTY)
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Falha ao enviar resposta.",
      )
    }
  })

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea placeholder="Escreva uma resposta…" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {submitError && <p className="text-sm text-destructive">{submitError}</p>}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <FormField
            control={form.control}
            name="isInternalNote"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="text-sm font-normal text-foreground/70">
                  Nota interna (cliente não vê)
                </FormLabel>
              </FormItem>
            )}
          />

          <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
            {submitting ? "Enviando…" : "Enviar"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
