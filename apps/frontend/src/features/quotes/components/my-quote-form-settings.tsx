"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Check, Copy, FileText, Loader2 } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Switch } from "@/shared/components/ui/switch"
import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form"
import { ApiError } from "@/infrastructure/api/client"
import {
  useMyQuoteForm,
  useUpsertMyQuoteForm,
} from "../hooks/use-my-quote-form"
import {
  upsertMyQuoteFormSchema,
  type UpsertMyQuoteFormValues,
} from "../schemas/quote-form.schema"

const EMPTY: UpsertMyQuoteFormValues = {
  slug: "",
  displayName: "",
  enabled: false,
}

const DEFAULT_SAVE_ERROR = "Não foi possível salvar. Tente novamente."

interface MyQuoteFormSettingsProps {
  orgId: string
}

export function MyQuoteFormSettings({ orgId }: MyQuoteFormSettingsProps) {
  const { data, loading, notFound, error } = useMyQuoteForm(orgId)
  const { save, saving } = useUpsertMyQuoteForm(orgId)
  const [origin, setOrigin] = React.useState("")
  const [saveError, setSaveError] = React.useState<string | null>(null)
  const [saved, setSaved] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  const form = useForm<UpsertMyQuoteFormValues>({
    resolver: zodResolver(upsertMyQuoteFormSchema),
    defaultValues: EMPTY,
  })

  const currentForm = data?.form ?? null

  React.useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  React.useEffect(() => {
    form.reset(
      currentForm
        ? {
            slug: currentForm.slug,
            displayName: currentForm.displayName,
            enabled: currentForm.enabled,
          }
        : EMPTY,
    )
  }, [currentForm, form])

  const slugValue = form.watch("slug")
  const slugChanged =
    !!currentForm && slugValue.trim().toLowerCase() !== currentForm.slug

  const handleSubmit = form.handleSubmit(async (values) => {
    setSaveError(null)
    setSaved(false)
    try {
      await save(values)
      setSaved(true)
    } catch (err) {
      if (err instanceof ApiError && err.code === "QUOTE_FORM_SLUG_UNAVAILABLE") {
        form.setError("slug", {
          message: "Este endereço não está disponível. Escolha outro.",
        })
        return
      }
      if (
        err instanceof ApiError &&
        err.code === "QUOTE_REQUEST_INVALID" &&
        err.details?.reason === "slug_invalid"
      ) {
        form.setError("slug", { message: "Endereço inválido." })
        return
      }
      setSaveError(DEFAULT_SAVE_ERROR)
    }
  })

  async function handleCopy() {
    if (!currentForm) return
    try {
      await navigator.clipboard.writeText(
        `${origin}/orcamento/${currentForm.slug}`,
      )
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4" aria-busy="true">
        <div className="h-11 animate-pulse rounded-md bg-foreground/[0.04]" />
        <div className="h-11 animate-pulse rounded-md bg-foreground/[0.04]" />
        <div className="h-11 animate-pulse rounded-md bg-foreground/[0.04]" />
      </div>
    )
  }

  if (notFound) {
    return (
      <EmptyNotice
        title="Recurso ainda não disponível para sua organização"
        description="O formulário público de orçamento será liberado em breve."
      />
    )
  }

  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Não foi possível carregar as configurações. Tente novamente.
        </AlertDescription>
      </Alert>
    )
  }

  if (!data.canConfigure) {
    return (
      <Alert variant="warning">
        <AlertDescription>
          Sua conta não é membro desta organização, por isso não há formulário
          de orçamento próprio para configurar.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="grid gap-5">
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Endereço do formulário</FormLabel>
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
                <span className="truncate text-sm text-foreground/40">
                  {origin}/orcamento/
                </span>
                <FormControl>
                  <Input
                    className="h-11 sm:flex-1"
                    placeholder="meu-estudio"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    {...field}
                  />
                </FormControl>
              </div>
              <FormDescription>
                Use este link na bio do Instagram. Letras minúsculas, números e
                hífen (3 a 40 caracteres).
              </FormDescription>
              <FormMessage />
              {slugChanged && (
                <p className="text-xs text-warning">
                  Ao trocar o endereço, o link antigo deixa de funcionar.
                </p>
              )}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome público</FormLabel>
              <FormControl>
                <Input
                  className="h-11"
                  placeholder="Como você quer aparecer para o cliente"
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
          name="enabled"
          render={({ field }) => (
            <FormItem>
              <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-md border border-foreground/[0.06] bg-foreground/[0.02] px-3 py-2 text-sm">
                <span>Formulário ativo</span>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={saving}
                />
              </label>
            </FormItem>
          )}
        />

        {saveError && (
          <Alert variant="destructive">
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button type="submit" size="lg" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar
          </Button>
          {currentForm?.enabled && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? "Link copiado" : "Copiar link"}
            </Button>
          )}
          {saved && !saving && (
            <span className="text-sm text-success" role="status">
              Configurações salvas.
            </span>
          )}
        </div>
      </form>
    </Form>
  )
}

function EmptyNotice({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-6 text-center sm:p-8">
      <FileText className="h-6 w-6 text-foreground/30" />
      <p className="text-sm font-medium">{title}</p>
      <p className="text-sm text-foreground/50">{description}</p>
    </div>
  )
}
