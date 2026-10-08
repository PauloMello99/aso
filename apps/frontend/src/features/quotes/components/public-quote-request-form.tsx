"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { cn } from "@/shared/lib/utils"
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
import { Button } from "@/shared/components/ui/button"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"
import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import { ApiError } from "@/infrastructure/api/client"
import {
  TurnstileWidget,
  type TurnstileWidgetHandle,
} from "@/features/support"
import {
  usePublicQuoteForm,
  useSubmitQuoteRequest,
} from "../hooks/use-public-quote-form"
import {
  QUOTE_IDEA_MAX_LENGTH,
  submitQuoteRequestFormSchema,
  type SubmitQuoteRequestFormValues,
} from "../schemas/quote-form.schema"
import { QuoteImagePicker } from "./quote-image-picker"

const DEFAULT_SUBMIT_ERROR =
  "Não foi possível enviar o pedido. Tente novamente."

const INVALID_REASON_MESSAGES: Record<string, string> = {
  consent_version:
    "O formulário foi atualizado. Recarregue a página e envie novamente.",
  consent_required: "É necessário aceitar o uso dos seus dados para continuar.",
  image_type: "Uma das imagens não é de um formato aceito (JPG, PNG, WebP ou HEIC).",
  image_size: "Uma das imagens passa de 5 MB.",
  image_count: "Envie no máximo 3 imagens.",
}

function submitErrorMessage(err: unknown): string {
  if (!(err instanceof ApiError)) return DEFAULT_SUBMIT_ERROR
  if (err.status === 429) {
    return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente."
  }
  if (err.status === 413) {
    return "As imagens são grandes demais. Envie arquivos de até 5 MB cada."
  }
  switch (err.code) {
    case "CAPTCHA_VERIFICATION_FAILED":
      return "Não foi possível confirmar a verificação de segurança. Tente novamente."
    case "QUOTE_IMAGE_UPLOAD_FAILED":
      return "Não foi possível enviar as imagens. Tente novamente em instantes ou envie sem imagens."
    case "QUOTE_REQUEST_INVALID": {
      const reason = err.details?.reason
      return (
        (reason ? INVALID_REASON_MESSAGES[reason] : undefined) ??
        "Confira os dados informados e tente novamente."
      )
    }
    default:
      return DEFAULT_SUBMIT_ERROR
  }
}

const EMPTY: SubmitQuoteRequestFormValues = {
  name: "",
  phone: "",
  email: "",
  idea: "",
  privacyConsent: false,
  contactRetentionConsent: false,
  turnstileToken: "",
}

interface PublicQuoteRequestFormProps {
  slug: string
}

export function PublicQuoteRequestForm({ slug }: PublicQuoteRequestFormProps) {
  const { form: quoteForm, loading, error } = usePublicQuoteForm(slug)
  const { submit, submitting } = useSubmitQuoteRequest(slug)
  const turnstileRef = React.useRef<TurnstileWidgetHandle>(null)
  const [files, setFiles] = React.useState<File[]>([])
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [unavailable, setUnavailable] = React.useState(false)
  const [sent, setSent] = React.useState(false)

  const form = useForm<SubmitQuoteRequestFormValues>({
    resolver: zodResolver(submitQuoteRequestFormSchema),
    defaultValues: EMPTY,
  })

  const turnstileToken = form.watch("turnstileToken")
  const idea = form.watch("idea")

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!quoteForm) return
    setSubmitError(null)
    const { turnstileToken: token, ...fields } = values
    try {
      await submit({
        values: fields,
        consentVersion: quoteForm.consent.version,
        files,
        turnstileToken: token,
      })
      setSent(true)
    } catch (err) {
      if (err instanceof ApiError && err.code === "QUOTE_FORM_NOT_FOUND") {
        setUnavailable(true)
        return
      }
      setSubmitError(submitErrorMessage(err))
      // O token do Turnstile é de uso único: sempre pedir um novo após erro.
      form.setValue("turnstileToken", "")
      turnstileRef.current?.reset()
    }
  })

  if (loading) {
    return (
      <Centered>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="h-6 w-2/3 animate-pulse rounded bg-foreground/[0.06]" />
          <div className="h-11 animate-pulse rounded bg-foreground/[0.04]" />
          <div className="h-11 animate-pulse rounded bg-foreground/[0.04]" />
          <div className="h-24 animate-pulse rounded bg-foreground/[0.04]" />
        </CardContent>
      </Centered>
    )
  }

  if (unavailable || (error instanceof ApiError && error.status === 404)) {
    return (
      <Centered>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Formulário indisponível</CardTitle>
          <CardDescription className="text-foreground/40">
            Este formulário de orçamento não está disponível no momento.
          </CardDescription>
        </CardHeader>
      </Centered>
    )
  }

  if (error || !quoteForm) {
    return (
      <Centered>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Não foi possível carregar</CardTitle>
          <CardDescription className="text-foreground/40">
            Tente novamente em alguns instantes.
          </CardDescription>
        </CardHeader>
      </Centered>
    )
  }

  if (sent) {
    return (
      <Centered>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Pedido enviado</CardTitle>
          <CardDescription className="text-foreground/40">
            Recebemos o seu pedido de orçamento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-foreground/60">
            {quoteForm.professionalName} entrará em contato com você em breve.
          </p>
        </CardContent>
      </Centered>
    )
  }

  return (
    <Centered>
      <Form {...form}>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="text-xl">Pedir orçamento</CardTitle>
            <CardDescription className="text-foreground/40">
              {quoteForm.professionalName} · {quoteForm.studioName}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
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
                      className="h-11 text-base sm:text-sm"
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
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Telefone <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="h-11 text-base sm:text-sm"
                      type="tel"
                      inputMode="tel"
                      placeholder="(11) 91234-5678"
                      autoComplete="tel"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    E-mail <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="h-11 text-base sm:text-sm"
                      type="email"
                      inputMode="email"
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
              name="idea"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Sua ideia <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-28 text-base sm:text-sm"
                      placeholder="Descreva a tattoo: tema, tamanho, local do corpo…"
                      {...field}
                    />
                  </FormControl>
                  <div className="flex items-start justify-between gap-2">
                    <FormMessage />
                    <span
                      className={cn(
                        "ml-auto text-xs text-foreground/40",
                        idea.length > QUOTE_IDEA_MAX_LENGTH && "text-destructive",
                      )}
                    >
                      {idea.length}/{QUOTE_IDEA_MAX_LENGTH}
                    </span>
                  </div>
                </FormItem>
              )}
            />

            <QuoteImagePicker
              files={files}
              onChange={setFiles}
              disabled={submitting}
            />

            <FormField
              control={form.control}
              name="privacyConsent"
              render={({ field }) => (
                <FormItem>
                  <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm text-foreground/70">
                    <FormControl>
                      <Checkbox
                        className="mt-0.5"
                        checked={field.value}
                        onCheckedChange={(checked) =>
                          field.onChange(checked === true)
                        }
                        disabled={submitting}
                      />
                    </FormControl>
                    <span>
                      {quoteForm.consent.privacyText}{" "}
                      <span className="text-destructive">*</span>
                    </span>
                  </label>
                  <a
                    href="/legal/privacidade"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center text-sm text-primary underline-offset-4 hover:underline"
                  >
                    Política de privacidade
                  </a>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactRetentionConsent"
              render={({ field }) => (
                <FormItem>
                  <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm text-foreground/70">
                    <FormControl>
                      <Checkbox
                        className="mt-0.5"
                        checked={field.value}
                        onCheckedChange={(checked) =>
                          field.onChange(checked === true)
                        }
                        disabled={submitting}
                      />
                    </FormControl>
                    <span>
                      {quoteForm.consent.contactRetentionText}{" "}
                      <span className="text-foreground/40">(opcional)</span>
                    </span>
                  </label>
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
              size="lg"
              className="w-full"
              disabled={submitting || !turnstileToken}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar pedido
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
