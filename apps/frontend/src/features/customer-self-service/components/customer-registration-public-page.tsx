"use client"

import * as React from "react"
import { Controller, useForm, type Control, type FieldErrors } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, RefreshCw } from "lucide-react"
import {
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
import { Checkbox } from "@/shared/components/ui/checkbox"
import { PhoneInput } from "@/shared/components/ui/phone-input"
import { DatePicker } from "@/shared/components/ui/date-picker"
import { Separator } from "@/shared/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { cn } from "@/shared/lib/utils"
import { ApiError } from "@/infrastructure/api/client"
import { SignaturePadField } from "@/features/anamnesis"
import type { AnamnesisAnswerInput, AnamnesisQuestion } from "@/features/anamnesis"
import {
  useCustomerRegistrationLookup,
  useSubmitCustomerRegistration,
} from "../hooks/use-customer-registration-public"
import {
  buildCustomerRegistrationSchema,
  REGISTRATION_STEP_1_FIELDS,
  type CustomerRegistrationFormValues,
} from "../schemas/customer-registration.schemas"
import { fetchAddressByCep } from "@/shared/lib/viacep"
import { resolvePublicLookupErrorState } from "../lib/public-lookup-state"
import {
  PublicFormCentered,
  PublicFormMessageCard,
  PublicFormSpinner,
} from "./public-form-shell"
import type { RegistrationAnamnesisForm } from "../types"

const GENDER_NONE = "none"

const REGISTRATION_ERROR_CODES = {
  expired: "CUSTOMER_SELF_REGISTRATION_EXPIRED",
  alreadySubmitted: "CUSTOMER_SELF_REGISTRATION_ALREADY_SUBMITTED",
}

const SUBMIT_ERROR_MESSAGES: Record<string, string> = {
  CUSTOMER_SELF_REGISTRATION_EXPIRED: "Este link expirou.",
  CUSTOMER_SELF_REGISTRATION_ALREADY_SUBMITTED:
    "Este cadastro já foi enviado, obrigado!",
  ANAMNESIS_RESPONSE_EXPIRED: "Este link expirou.",
  ANAMNESIS_RESPONSE_ALREADY_SUBMITTED: "Você já respondeu esta ficha, obrigado!",
  ANAMNESIS_INVALID_ANSWERS:
    "Não foi possível validar suas respostas. Revise os campos e tente novamente.",
  ANAMNESIS_SIGNATURE_REQUIRED:
    "Não foi possível processar a assinatura. Tente desenhar novamente.",
  ANAMNESIS_CONSENT_REQUIRED:
    "É necessário concordar com o termo de consentimento. Se o problema persistir, recarregue a página.",
}
const DEFAULT_SUBMIT_ERROR_MESSAGE =
  "Não foi possível enviar seu cadastro. Tente novamente."

function submitErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.code) {
    return SUBMIT_ERROR_MESSAGES[err.code] ?? DEFAULT_SUBMIT_ERROR_MESSAGE
  }
  return DEFAULT_SUBMIT_ERROR_MESSAGE
}

function Stepper({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <div className="flex items-center gap-1.5">
        {[1, 2].map((n) => (
          <span
            key={n}
            className={cn(
              "h-1.5 w-6 rounded-full",
              n <= step ? "bg-primary" : "bg-foreground/10",
            )}
          />
        ))}
      </div>
      <span className="text-xs text-foreground/40">Passo {step} de 2</span>
    </div>
  )
}

interface StepFieldsProps {
  control: Control<CustomerRegistrationFormValues>
  errors: FieldErrors<CustomerRegistrationFormValues>
}

interface RegistrationStep1FieldsProps extends StepFieldsProps {
  onPostalCodeBlur: (value: string) => Promise<void>
}

function RegistrationStep1Fields({
  control,
  errors,
  onPostalCodeBlur,
}: RegistrationStep1FieldsProps) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label>
          Nome<span className="ml-1 text-destructive">*</span>
        </Label>
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <Input placeholder="Seu nome completo" {...field} />
          )}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Telefone</Label>
        <Controller
          control={control}
          name="phone"
          render={({ field }) => (
            <PhoneInput value={field.value} onChange={field.onChange} />
          )}
        />
        {errors.phone && (
          <p className="text-xs text-destructive">{errors.phone.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Gênero</Label>
          <Controller
            control={control}
            name="gender"
            render={({ field }) => (
              <Select
                value={field.value ? field.value : GENDER_NONE}
                onValueChange={(v) =>
                  field.onChange(v === GENDER_NONE ? "" : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Não informado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={GENDER_NONE}>Não informado</SelectItem>
                  <SelectItem value="female">Feminino</SelectItem>
                  <SelectItem value="male">Masculino</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.gender && (
            <p className="text-xs text-destructive">{errors.gender.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>
            Nascimento<span className="ml-1 text-destructive">*</span>
          </Label>
          <Controller
            control={control}
            name="birthDate"
            render={({ field }) => (
              <DatePicker
                value={field.value}
                onChange={field.onChange}
                placeholder="dd/mm/aaaa"
                align="end"
              />
            )}
          />
          {errors.birthDate && (
            <p className="text-xs text-destructive">
              {errors.birthDate.message}
            </p>
          )}
        </div>
      </div>

      <Separator className="bg-foreground/[0.06]" />
      <p className="-mb-1 text-xs font-medium uppercase tracking-wider text-foreground/30">
        Endereço
      </p>

      <div className="flex flex-col gap-1.5">
        <Label>CEP / Código postal</Label>
        <Controller
          control={control}
          name="postalCode"
          render={({ field }) => (
            <Input
              placeholder="Ex: 01310-100"
              {...field}
              onBlur={(e) => {
                field.onBlur()
                void onPostalCodeBlur(e.target.value)
              }}
            />
          )}
        />
        {errors.postalCode && (
          <p className="text-xs text-destructive">{errors.postalCode.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>
          Logradouro<span className="ml-1 text-destructive">*</span>
        </Label>
        <Controller
          control={control}
          name="address"
          render={({ field }) => <Input placeholder="Rua, avenida" {...field} />}
        />
        {errors.address && (
          <p className="text-xs text-destructive">{errors.address.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>
            Número<span className="ml-1 text-destructive">*</span>
          </Label>
          <Controller
            control={control}
            name="number"
            render={({ field }) => <Input placeholder="Ex: 123" {...field} />}
          />
          {errors.number && (
            <p className="text-xs text-destructive">{errors.number.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Complemento</Label>
          <Controller
            control={control}
            name="addressLine2"
            render={({ field }) => (
              <Input placeholder="Apto, bloco, referência" {...field} />
            )}
          />
          {errors.addressLine2 && (
            <p className="text-xs text-destructive">
              {errors.addressLine2.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>
            Cidade<span className="ml-1 text-destructive">*</span>
          </Label>
          <Controller
            control={control}
            name="city"
            render={({ field }) => <Input placeholder="Ex: São Paulo" {...field} />}
          />
          {errors.city && (
            <p className="text-xs text-destructive">{errors.city.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>
            Estado<span className="ml-1 text-destructive">*</span>
          </Label>
          <Controller
            control={control}
            name="state"
            render={({ field }) => <Input placeholder="Ex: SP" {...field} />}
          />
          {errors.state && (
            <p className="text-xs text-destructive">{errors.state.message}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>País (ISO)</Label>
        <Controller
          control={control}
          name="country"
          render={({ field }) => (
            <Input
              placeholder="BR"
              maxLength={2}
              className="uppercase"
              {...field}
              onChange={(e) => field.onChange(e.target.value.toUpperCase())}
            />
          )}
        />
        {errors.country && (
          <p className="text-xs text-destructive">{errors.country.message}</p>
        )}
      </div>
    </>
  )
}

interface RegistrationQuestionFieldProps {
  question: AnamnesisQuestion
  index: number
  control: Control<CustomerRegistrationFormValues>
  error?: string
}

function RegistrationQuestionField({
  question,
  index,
  control,
  error,
}: RegistrationQuestionFieldProps) {
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

interface RegistrationStep2FieldsProps extends StepFieldsProps {
  questions: AnamnesisQuestion[]
  consent: { version: string; text: string }
}

function RegistrationStep2Fields({
  control,
  errors,
  questions,
  consent,
}: RegistrationStep2FieldsProps) {
  return (
    <>
      {questions.map((question, index) => (
        <RegistrationQuestionField
          key={question.id}
          question={question}
          index={index}
          control={control}
          error={errors.answers?.[index]?.value?.message}
        />
      ))}

      <div className="flex flex-col gap-1.5">
        <Label>
          Nome completo<span className="ml-1 text-destructive">*</span>
        </Label>
        <Controller
          control={control}
          name="signerFullName"
          render={({ field }) => (
            <Input placeholder="Seu nome completo" {...field} />
          )}
        />
        {errors.signerFullName && (
          <p className="text-xs text-destructive">
            {errors.signerFullName.message}
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
        {errors.signerCpf && (
          <p className="text-xs text-destructive">{errors.signerCpf.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>
          Termo de Consentimento<span className="ml-1 text-destructive">*</span>
        </Label>
        <div className="max-h-40 overflow-y-auto whitespace-pre-line rounded-md border border-foreground/10 bg-foreground/5 p-3 text-xs leading-relaxed text-foreground/60">
          {consent.text}
        </div>
        <div className="flex items-start gap-2 pt-1">
          <Controller
            control={control}
            name="consentAccepted"
            render={({ field }) => (
              <Checkbox
                id="consentAccepted"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                className="mt-0.5"
              />
            )}
          />
          <Label
            htmlFor="consentAccepted"
            className="text-sm font-normal leading-relaxed text-foreground/60"
          >
            Li e concordo com o termo de consentimento acima.
          </Label>
        </div>
        {errors.consentAccepted && (
          <p className="text-xs text-destructive">
            {errors.consentAccepted.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>
          Assinatura<span className="ml-1 text-destructive">*</span>
        </Label>
        <Controller
          control={control}
          name="signatureImageBase64"
          render={({ field }) => (
            <SignaturePadField
              value={field.value}
              onChange={field.onChange}
              error={errors.signatureImageBase64?.message}
            />
          )}
        />
      </div>
    </>
  )
}

interface CustomerRegistrationFormProps {
  token: string
  organizationName: string
  serviceTypeName: string | null
  anamnesisForm: RegistrationAnamnesisForm
  onSubmitted: () => void
}

function CustomerRegistrationForm({
  token,
  organizationName,
  serviceTypeName,
  anamnesisForm,
  onSubmitted,
}: CustomerRegistrationFormProps) {
  const { mutateAsync: submit, isPending: submitting } =
    useSubmitCustomerRegistration(token)
  const [step, setStep] = React.useState<1 | 2>(1)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const lastAppliedCepRef = React.useRef<string | null>(null)

  const schema = React.useMemo(
    () => buildCustomerRegistrationSchema(anamnesisForm.questions),
    [anamnesisForm.questions],
  )

  const { control, handleSubmit, formState, watch, trigger, setValue, getValues } =
    useForm<CustomerRegistrationFormValues>({
      resolver: zodResolver(schema),
      defaultValues: {
        name: "",
        phone: "",
        gender: "",
        birthDate: "",
        address: "",
        addressLine2: "",
        number: "",
        city: "",
        state: "",
        postalCode: "",
        country: "",
        answers: anamnesisForm.questions.map((question) => ({
          questionId: question.id,
          value: undefined,
        })),
        signerFullName: "",
        signerCpf: "",
        signatureImageBase64: "",
        consentAccepted: false,
      },
    })

  const signatureValue = watch("signatureImageBase64")
  const consentAcceptedValue = watch("consentAccepted")

  async function handleContinue() {
    const valid = await trigger([...REGISTRATION_STEP_1_FIELDS])
    if (!valid) return
    if (!getValues("signerFullName")) {
      setValue("signerFullName", getValues("name"))
    }
    setStep(2)
  }

  async function handlePostalCodeChange(value: string) {
    const cepDigits = value.replace(/\D/g, "")
    if (cepDigits.length !== 8 || lastAppliedCepRef.current === cepDigits) {
      return
    }
    lastAppliedCepRef.current = cepDigits
    const result = await fetchAddressByCep(value)
    if (result) {
      if (result.address) setValue("address", result.address, { shouldValidate: true })
      if (result.city) setValue("city", result.city, { shouldValidate: true })
      if (result.state) setValue("state", result.state, { shouldValidate: true })
    }
  }

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
        name: values.name.trim(),
        birthDate: values.birthDate,
        phone: values.phone || null,
        gender: values.gender ? (values.gender as "male" | "female" | "other") : null,
        address: values.address.trim(),
        number: values.number.trim(),
        addressLine2: values.addressLine2 || null,
        city: values.city.trim(),
        state: values.state.trim(),
        postalCode: values.postalCode || null,
        country: values.country || null,
        answers,
        signerFullName: values.signerFullName.trim(),
        signerCpf: cpfDigits.length > 0 ? cpfDigits : undefined,
        signatureImageBase64: values.signatureImageBase64,
        consentAccepted: values.consentAccepted,
        consentVersion: anamnesisForm.consent.version,
      })
      onSubmitted()
    } catch (err) {
      setSubmitError(submitErrorMessage(err))
    }
  })

  return (
    <form onSubmit={(e) => void onSubmit(e)}>
      <CardHeader>
        <CardTitle className="text-xl">Complete seu cadastro</CardTitle>
        <CardDescription className="text-foreground/40">
          {organizationName} solicita que você complete seus dados
          {serviceTypeName ? ` para ${serviceTypeName}` : ""}.
        </CardDescription>
        <Stepper step={step} />
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {step === 1 ? (
          <RegistrationStep1Fields
            control={control}
            errors={formState.errors}
            onPostalCodeBlur={handlePostalCodeChange}
          />
        ) : (
          <RegistrationStep2Fields
            control={control}
            errors={formState.errors}
            questions={anamnesisForm.questions}
            consent={anamnesisForm.consent}
          />
        )}

        {step === 2 && submitError && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {submitError}
          </p>
        )}
      </CardContent>

      <CardFooter className="flex-col gap-2 sm:flex-row">
        {step === 1 ? (
          <Button
            type="button"
            className="w-full"
            onClick={() => void handleContinue()}
          >
            Continuar
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setStep(1)}
            >
              Voltar
            </Button>
            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:flex-1"
              disabled={submitting || !signatureValue || !consentAcceptedValue}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar cadastro e ficha
            </Button>
          </>
        )}
      </CardFooter>
    </form>
  )
}

interface CustomerRegistrationPublicPageProps {
  token: string | undefined
}

export function CustomerRegistrationPublicPage({
  token,
}: CustomerRegistrationPublicPageProps) {
  const {
    data: lookup,
    isLoading,
    error,
    isFetching,
    refetch,
  } = useCustomerRegistrationLookup(token)
  const [submitted, setSubmitted] = React.useState(false)

  if (isLoading) return <PublicFormSpinner />

  if (!token || error || !lookup) {
    const state =
      token && error
        ? resolvePublicLookupErrorState(error, REGISTRATION_ERROR_CODES)
        : "invalid"

    if (state === "expired") {
      return (
        <PublicFormMessageCard
          title="Link expirado"
          description="Este link expirou. Entre em contato para receber um novo."
        />
      )
    }
    if (state === "already_submitted") {
      return (
        <PublicFormMessageCard
          title="Cadastro já enviado"
          description="Este cadastro já foi enviado, obrigado!"
        />
      )
    }
    if (state === "error") {
      return (
        <PublicFormMessageCard
          title="Não foi possível carregar"
          description="Não foi possível carregar seu cadastro. Tente novamente."
          action={
            <Button
              variant="outline"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              <RefreshCw
                className={cn("mr-2 h-4 w-4", isFetching && "animate-spin")}
              />
              Tentar novamente
            </Button>
          }
        />
      )
    }
    return (
      <PublicFormMessageCard
        title="Link inválido"
        description="Este link de cadastro não é válido."
      />
    )
  }

  if (submitted || lookup.status === "submitted") {
    return (
      <PublicFormMessageCard
        title="Obrigado!"
        description="Seu cadastro e ficha foram enviados com sucesso."
      />
    )
  }

  if (lookup.status === "expired") {
    return (
      <PublicFormMessageCard
        title="Link expirado"
        description="Este link expirou. Entre em contato para receber um novo."
      />
    )
  }

  if (!lookup.anamnesisForm) {
    return (
      <PublicFormMessageCard
        title="Link inválido"
        description="Este link de cadastro não é válido."
      />
    )
  }

  return (
    <PublicFormCentered>
      <CustomerRegistrationForm
        token={token}
        organizationName={lookup.organizationName}
        serviceTypeName={lookup.serviceTypeName}
        anamnesisForm={lookup.anamnesisForm}
        onSubmitted={() => setSubmitted(true)}
      />
    </PublicFormCentered>
  )
}
