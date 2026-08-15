"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
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
import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import { ApiError } from "@/infrastructure/api/client"
import {
  usePublicTicketCategories,
  useCreatePublicTicket,
} from "../hooks/use-public-ticket"
import {
  createPublicTicketSchema,
  type CreatePublicTicketFormValues,
} from "../schemas/public-ticket.schema"
import { TurnstileWidget, type TurnstileWidgetHandle } from "./turnstile-widget"

const SUBMIT_ERROR_MESSAGES: Record<string, string> = {
  CAPTCHA_VERIFICATION_FAILED:
    "Não foi possível confirmar a verificação de segurança. Tente novamente.",
  TICKET_CATEGORY_INVALID: "Categoria inválida. Selecione novamente.",
}
const DEFAULT_SUBMIT_ERROR_MESSAGE =
  "Não foi possível abrir o chamado. Tente novamente."

function submitErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 429) {
      return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente."
    }
    if (err.code) {
      return SUBMIT_ERROR_MESSAGES[err.code] ?? DEFAULT_SUBMIT_ERROR_MESSAGE
    }
  }
  return DEFAULT_SUBMIT_ERROR_MESSAGE
}

const EMPTY: CreatePublicTicketFormValues = {
  requesterName: "",
  requesterEmail: "",
  subject: "",
  description: "",
  categorySystemKey: "",
  turnstileToken: "",
}

export function PublicTicketForm() {
  const { categories, loading: loadingCategories, error: categoriesError } =
    usePublicTicketCategories()
  const { createTicket, creating } = useCreatePublicTicket()
  const turnstileRef = React.useRef<TurnstileWidgetHandle>(null)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [ticketId, setTicketId] = React.useState<string | null>(null)

  const form = useForm<CreatePublicTicketFormValues>({
    resolver: zodResolver(createPublicTicketSchema),
    defaultValues: EMPTY,
  })

  const turnstileToken = form.watch("turnstileToken")

  const handleSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null)
    try {
      const response = await createTicket(values)
      setTicketId(response.ticketId)
    } catch (err) {
      setSubmitError(submitErrorMessage(err))
      form.setValue("turnstileToken", "")
      turnstileRef.current?.reset()
    }
  })

  if (ticketId) {
    return (
      <Centered>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Chamado aberto</CardTitle>
          <CardDescription className="text-foreground/40">
            Protocolo do seu chamado: <span className="font-mono">{ticketId}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-foreground/60">
            Você receberá a resposta da nossa equipe por e-mail.
          </p>
        </CardContent>
      </Centered>
    )
  }

  if (categoriesError) {
    return (
      <Centered>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Suporte indisponível</CardTitle>
          <CardDescription className="text-foreground/40">
            O formulário de suporte não está disponível no momento. Tente
            novamente mais tarde.
          </CardDescription>
        </CardHeader>
      </Centered>
    )
  }

  return (
    <Centered>
      <Form {...form}>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="text-xl">Abrir chamado</CardTitle>
            <CardDescription className="text-foreground/40">
              Descreva o problema ou dúvida para o time de suporte.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="requesterName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Nome <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Seu nome completo"
                      autoComplete="name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requesterEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    E-mail <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      autoComplete="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categorySystemKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Categoria <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={loadingCategories}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.systemKey}>
                          {c.label}
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

            <TurnstileWidget
              ref={turnstileRef}
              onToken={(token) =>
                form.setValue("turnstileToken", token ?? "", {
                  shouldValidate: true,
                })
              }
            />

            {submitError && (
              <Alert variant="destructive">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}
          </CardContent>

          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={creating || !turnstileToken}
            >
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Abrir chamado
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Centered>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6">
      <Card className="w-full max-w-md border-foreground/5 bg-foreground/[0.03] sm:max-w-lg">
        {children}
      </Card>
    </div>
  )
}
