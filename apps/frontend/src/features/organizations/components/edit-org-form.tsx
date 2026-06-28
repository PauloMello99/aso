"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
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
import { updateOrgSchema, type UpdateOrgFormValues } from "../schemas/org.schemas"
import type { OrgSummary } from "@/features/dashboard/hooks/use-orgs"

interface EditOrgFormProps {
  org: OrgSummary
  onSubmit: (values: UpdateOrgFormValues) => Promise<void>
}

export function EditOrgForm({ org, onSubmit }: EditOrgFormProps) {
  const form = useForm<UpdateOrgFormValues>({
    resolver: zodResolver(updateOrgSchema),
    defaultValues: { name: org.name },
  })

  useEffect(() => {
    form.reset({ name: org.name })
  }, [org.name, form])

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values)
  })

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da organização</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Studio Ink" autoComplete="off" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Slug is auto-generated and read-only */}
        <div className="grid gap-1.5">
          <span className="text-sm font-medium leading-none text-foreground/70">
            Identificador (slug)
          </span>
          <div className="flex h-9 items-center rounded-md border border-foreground/10 bg-foreground/[0.03] px-3 font-mono text-sm text-foreground/40 select-all">
            {org.slug}
          </div>
          <p className="text-xs text-foreground/30">
            Gerado automaticamente — não pode ser alterado.
          </p>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={form.formState.isSubmitting || !form.formState.isDirty}
            className="w-full sm:w-auto"
          >
            {form.formState.isSubmitting ? "Salvando…" : "Salvar alterações"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
