"use client"

import * as React from "react"
import { Controller, useForm, type Control } from "react-hook-form"
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
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"
import { Label } from "@/shared/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { ApiError } from "@/infrastructure/api/client"
import {
  useAnamnesisPublicLookup,
  useSubmitAnamnesisResponse,
} from "../hooks/use-anamnesis-public"
import {
  buildAnamnesisAnswersSchema,
  type AnamnesisAnswersFormValues,
} from "../schemas/anamnesis-response.schemas"
import { SignaturePadField } from "./signature-pad-field"
import type { AnamnesisAnswerInput, AnamnesisQuestion } from "../types"

const SUBMIT_ERROR_MESSAGES: Record<string, string> = {
  ANAMNESIS_RESPONSE_EXPIRED: "Este link expirou.",
  ANAMNESIS_RESPONSE_ALREADY_SUBMITTED: "Você já respondeu esta ficha, obrigado!",
  ANAMNESIS_INVALID_ANSWERS:
    "Não foi possível validar suas respostas. Revise os campos e tente novamente.",
  ANAMNESIS_SIGNATURE_REQUIRED:
    "Não foi possível processar a assinatura. Tente desenhar novamente.",
}
const DEFAULT_SUBMIT_ERROR_MESSAGE =
  "Não foi possível enviar suas respostas. Tente novamente."

function submitErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.code) {
    return SUBMIT_ERROR_MESSAGES[err.code] ?? DEFAULT_SUBMIT_ERROR_MESSAGE
  }
  return DEFAULT_SUBMIT_ERROR_MESSAGE
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

function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-foreground/30" />
    </div>
  )
}

interface AnamnesisQuestionFieldProps {
  question: AnamnesisQuestion
  index: number
  control: Control<AnamnesisAnswersFormValues>
  error?: string
}

function AnamnesisQuestionField({
  question,
  index,
  control,
  error,
}: AnamnesisQuestionFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>
        {question.label}
        {question.required && <span className="ml-1 text-destructive">*</span>}
      </Label>

      {question.type === "text" ? (
        <Controller
          control={control}
          name={`answers.${index}.value`}
          render={({ field }) => (
            <Textarea
              placeholder="Sua resposta"
              value={typeof field.value === "string" ? field.value : ""}
              onChange={field.onChange}
              onBlur={field.onBlur}
              name={field.name}
              ref={field.ref}
            />
          )}
        />
      ) : (
        <Controller
          control={control}
          name={`answers.${index}.value`}
          render={({ field }) => (
            <Select
              value={
                typeof field.value === "boolean" ? String(field.value) : undefined
              }
              onValueChange={(value) => field.onChange(value === "true")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Sim</SelectItem>
                <SelectItem value="false">Não</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

interface AnamnesisResponseFormProps {
  token: string
  questions: AnamnesisQuestion[]
  customerName: string
  onSubmitted: () => void
}

function AnamnesisResponseForm({
  token,
  questions,
  customerName,
  onSubmitted,
}: AnamnesisResponseFormProps) {
  const { mutateAsync: submit, isPending: submitting } =
    useSubmitAnamnesisResponse(token)
  const [submitError, setSubmitError] = React.useState<string | null>(null)

  const schema = React.useMemo(
    () => buildAnamnesisAnswersSchema(questions),
    [questions],
  )

  const { control, handleSubmit, formState, watch } =
    useForm<AnamnesisAnswersFormValues>({
      resolver: zodResolver(schema),
      defaultValues: {
        answers: questions.map((question) => ({
          questionId: question.id,
          value: undefined,
        })),
        signerFullName: "",
        signerCpf: "",
        signatureImageBase64: "",
      },
    })

  const signatureValue = watch("signatureImageBase64")

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null)
    const answers: AnamnesisAnswerInput[] = values.answers
      .filter(
        (answer) =>
          answer.value !== undefined &&
          !(typeof answer.value === "string" && answer.value.trim() === ""),
      )
      .map((answer) => ({
        questionId: answer.questionId,
        value: answer.value as string | boolean,
      }))

    const cpfDigits = values.signerCpf?.replace(/\D/g, "") ?? ""

    try {
      await submit({
        answers,
        signerFullName: values.signerFullName.trim(),
        signerCpf: cpfDigits.length > 0 ? cpfDigits : undefined,
        signatureImageBase64: values.signatureImageBase64,
      })
      onSubmitted()
    } catch (err) {
      setSubmitError(submitErrorMessage(err))
    }
  })

  return (
    <form onSubmit={(e) => void onSubmit(e)}>
      <CardHeader>
        <CardTitle className="text-xl">Ficha de anamnese</CardTitle>
        <CardDescription className="text-foreground/40">
          Olá, {customerName}. Responda as perguntas abaixo.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {questions.map((question, index) => (
          <AnamnesisQuestionField
            key={question.id}
            question={question}
            index={index}
            control={control}
            error={formState.errors.answers?.[index]?.value?.message}
          />
        ))}

        <div className="flex flex-col gap-1.5">
          <Label>
            Nome completo
            <span className="ml-1 text-destructive">*</span>
          </Label>
          <Controller
            control={control}
            name="signerFullName"
            render={({ field }) => (
              <Input placeholder="Seu nome completo" {...field} />
            )}
          />
          {formState.errors.signerFullName && (
            <p className="text-xs text-destructive">
              {formState.errors.signerFullName.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>CPF (opcional)</Label>
          <Controller
            control={control}
            name="signerCpf"
            render={({ field }) => (
              <Input placeholder="000.000.000-00" {...field} />
            )}
          />
          {formState.errors.signerCpf && (
            <p className="text-xs text-destructive">
              {formState.errors.signerCpf.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>
            Assinatura
            <span className="ml-1 text-destructive">*</span>
          </Label>
          <Controller
            control={control}
            name="signatureImageBase64"
            render={({ field }) => (
              <SignaturePadField
                value={field.value}
                onChange={field.onChange}
                error={formState.errors.signatureImageBase64?.message}
              />
            )}
          />
        </div>

        {submitError && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {submitError}
          </p>
        )}
      </CardContent>

      <CardFooter>
        <Button
          type="submit"
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          disabled={submitting || !signatureValue}
        >
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enviar respostas
        </Button>
      </CardFooter>
    </form>
  )
}

interface AnamnesisPublicPageProps {
  token: string | undefined
}

export function AnamnesisPublicPage({ token }: AnamnesisPublicPageProps) {
  const { data: lookup, isLoading, error } = useAnamnesisPublicLookup(token)
  const [submitted, setSubmitted] = React.useState(false)

  if (isLoading) return <Spinner />

  if (!token || error || !lookup) {
    return (
      <Centered>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Link inválido</CardTitle>
          <CardDescription className="text-foreground/40">
            Este link de ficha de anamnese não é válido.
          </CardDescription>
        </CardHeader>
      </Centered>
    )
  }

  if (submitted || lookup.status === "submitted") {
    return (
      <Centered>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Obrigado!</CardTitle>
          <CardDescription className="text-foreground/40">
            Sua resposta foi enviada com sucesso.
          </CardDescription>
        </CardHeader>
      </Centered>
    )
  }

  if (lookup.status === "expired") {
    return (
      <Centered>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Link expirado</CardTitle>
          <CardDescription className="text-foreground/40">
            Este link expirou. Entre em contato para receber um novo.
          </CardDescription>
        </CardHeader>
      </Centered>
    )
  }

  return (
    <Centered>
      <AnamnesisResponseForm
        token={token}
        questions={lookup.questions}
        customerName={lookup.customerName}
        onSubmitted={() => setSubmitted(true)}
      />
    </Centered>
  )
}
