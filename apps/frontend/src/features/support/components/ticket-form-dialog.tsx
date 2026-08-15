"use client"

import { useEffect, useState } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"
import { useTickets } from "../hooks/use-tickets"
import { useTicketCategories } from "../hooks/use-ticket-categories"
import {
  createTicketSchema,
  type CreateTicketFormValues,
} from "../schemas/ticket.schema"

interface TicketFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string
}

const EMPTY: CreateTicketFormValues = {
  categorySystemKey: "",
  subject: "",
  description: "",
}

function formatSlaHours(minutes: number): string {
  const hours = minutes / 60
  const formatted = Number.isInteger(hours) ? hours : hours.toFixed(1)
  return `${formatted}h para primeira resposta`
}

export function TicketFormDialog({
  open,
  onOpenChange,
  orgId,
}: TicketFormDialogProps) {
  const { createTicket } = useTickets(orgId)
  const { categories } = useTicketCategories(orgId)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<CreateTicketFormValues>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: EMPTY,
  })

  useEffect(() => {
    if (open) {
      setSubmitError(null)
      form.reset(EMPTY)
    }
  }, [open, form])

  const handleSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null)
    try {
      await createTicket(values)
      onOpenChange(false)
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Falha ao abrir o chamado.",
      )
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Abrir chamado</DialogTitle>
              <DialogDescription>
                Descreva o problema ou dúvida para o time de suporte.
              </DialogDescription>
            </DialogHeader>

            <FormField
              control={form.control}
              name="categorySystemKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Categoria <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.systemKey}>
                          {c.label} — {formatSlaHours(c.slaFirstResponseMinutes)}
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
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Assunto <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Resumo do chamado"
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Descrição <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detalhe o problema ou dúvida…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}

            <DialogFooter showCloseButton>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Enviando…" : "Abrir chamado"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
