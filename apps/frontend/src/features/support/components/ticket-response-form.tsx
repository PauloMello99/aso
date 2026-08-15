"use client"

import { useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Paperclip } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/shared/components/ui/form"
import { Textarea } from "@/shared/components/ui/textarea"
import {
  addResponseSchema,
  type AddResponseFormValues,
} from "../schemas/ticket.schema"

interface TicketResponseFormProps {
  onSubmitResponse: (body: string) => Promise<unknown>
  submitting: boolean
  onUploadAttachment: (file: File) => Promise<unknown>
  uploading: boolean
}

const EMPTY: AddResponseFormValues = { body: "" }
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024

export function TicketResponseForm({
  onSubmitResponse,
  submitting,
  onUploadAttachment,
  uploading,
}: TicketResponseFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const form = useForm<AddResponseFormValues>({
    resolver: zodResolver(addResponseSchema),
    defaultValues: EMPTY,
  })

  const handleSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null)
    try {
      await onSubmitResponse(values.body)
      form.reset(EMPTY)
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Falha ao enviar resposta.",
      )
    }
  })

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setUploadError(null)
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setUploadError("Arquivo deve ter no máximo 10 MB.")
      return
    }
    try {
      await onUploadAttachment(file)
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Falha ao enviar anexo.",
      )
    }
  }

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
        {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
            className="hidden"
            onChange={(e) => void handleFileChange(e)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="w-full sm:w-auto"
          >
            <Paperclip className="h-4 w-4" />
            {uploading ? "Enviando…" : "Anexar arquivo"}
          </Button>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto"
          >
            {submitting ? "Enviando…" : "Enviar resposta"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
