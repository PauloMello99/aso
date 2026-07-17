"use client"

import { useEffect, useState } from "react"
import { Controller, useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowDown, ArrowUp, Loader2, Plus, X } from "lucide-react"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/shared/components/ui/form"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Switch } from "@/shared/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { useAnamnesisForm } from "../hooks/use-anamnesis-form"
import {
  anamnesisFormSchema,
  type AnamnesisFormValues,
} from "../schemas/anamnesis.schemas"
import {
  ANAMNESIS_QUESTION_TYPE_LABELS,
  ANAMNESIS_QUESTION_TYPES,
} from "../types"

interface AnamnesisFormBuilderProps {
  orgId: string
  serviceTypeId: string
}

/**
 * Construtor da ficha de anamnese de um tipo de serviço. Cada "Salvar" cria
 * uma nova versão imutável no backend (nunca edita a anterior).
 */
export function AnamnesisFormBuilder({
  orgId,
  serviceTypeId,
}: AnamnesisFormBuilderProps) {
  const { currentVersion, loading, loadError, saveForm, saving } =
    useAnamnesisForm(orgId, serviceTypeId)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const form = useForm<AnamnesisFormValues>({
    resolver: zodResolver(anamnesisFormSchema),
    defaultValues: { questions: [] },
  })
  const { control, reset } = form
  // keyName customizado: o default ("id") sobrescreveria o id (UUID) de cada
  // pergunta no array `fields`, com um valor gerado pelo RHF que não é UUID —
  // isso vazaria pro payload do POST e o backend rejeitaria (@IsUUID em id).
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "questions",
    keyName: "_key",
  })

  useEffect(() => {
    if (!loading) {
      reset({ questions: currentVersion?.questions ?? [] })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, currentVersion])

  function addQuestion() {
    append({
      id: crypto.randomUUID(),
      type: "text",
      label: "",
      required: false,
    })
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null)
    setSaved(false)
    try {
      await saveForm(values.questions)
      setSaved(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar a ficha de anamnese.",
      )
    }
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-foreground/40">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando formulário…
      </div>
    )
  }

  if (loadError) {
    return (
      <p className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
        Não foi possível carregar a ficha de anamnese. Tente novamente.
      </p>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {fields.length === 0 ? (
          <p className="rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] p-4 text-sm text-foreground/40">
            Nenhuma pergunta ainda. Adicione a primeira abaixo.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {fields.map((field, index) => (
              <li
                key={field._key}
                className="flex flex-col gap-3 rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] p-3 sm:p-4"
              >
                <div className="flex items-start gap-2">
                  <FormField
                    control={control}
                    name={`questions.${index}.label`}
                    render={({ field: labelField }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            placeholder="Ex.: Você tem alguma alergia?"
                            aria-label="Texto da pergunta"
                            {...labelField}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={index === 0}
                      onClick={() => move(index, index - 1)}
                      title="Mover para cima"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={index === fields.length - 1}
                      onClick={() => move(index, index + 1)}
                      title="Mover para baixo"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => remove(index)}
                      title="Remover pergunta"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <FormField
                    control={control}
                    name={`questions.${index}.type`}
                    render={({ field: typeField }) => (
                      <FormItem>
                        <Select
                          value={typeField.value}
                          onValueChange={typeField.onChange}
                        >
                          <FormControl>
                            <SelectTrigger className="sm:w-48">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ANAMNESIS_QUESTION_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {ANAMNESIS_QUESTION_TYPE_LABELS[type]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <Controller
                    control={control}
                    name={`questions.${index}.required`}
                    render={({ field: requiredField }) => (
                      <label className="flex items-center gap-2 text-sm text-foreground/60">
                        <Switch
                          checked={requiredField.value}
                          onCheckedChange={requiredField.onChange}
                        />
                        Obrigatória
                      </label>
                    )}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={addQuestion}
          className="self-start"
        >
          <Plus className="h-4 w-4" />
          Adicionar pergunta
        </Button>

        {(form.formState.errors.questions?.root?.message ??
          form.formState.errors.questions?.message) && (
          <p className="text-sm text-destructive">
            {form.formState.errors.questions?.root?.message ??
              form.formState.errors.questions?.message}
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {saved && <p className="text-sm text-emerald-400">Ficha salva.</p>}

        <div>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar ficha
          </Button>
        </div>
      </form>
    </Form>
  )
}
