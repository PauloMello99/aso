"use client"

import * as React from "react"
import { Controller, useForm } from "react-hook-form"
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
import { Label } from "@/shared/components/ui/label"
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
import {
  useCustomerUpdateLookup,
  useSubmitCustomerUpdate,
} from "../hooks/use-customer-update-public"
import {
  customerUpdateSchema,
  type CustomerUpdateFormValues,
} from "../schemas/customer-update.schemas"
import { buildPartialUpdateBody } from "../lib/build-partial-update-body"
import { fetchAddressByCep } from "@/shared/lib/viacep"
import { resolvePublicLookupErrorState } from "../lib/public-lookup-state"
import {
  PublicFormCentered,
  PublicFormMessageCard,
  PublicFormSpinner,
} from "./public-form-shell"
import type { CustomerUpdateLookup } from "../types"

const GENDER_NONE = "none"

const UPDATE_ERROR_CODES = {
  expired: "CUSTOMER_UPDATE_INVITATION_EXPIRED",
  alreadySubmitted: "CUSTOMER_UPDATE_INVITATION_ALREADY_SUBMITTED",
}

const SUBMIT_ERROR_MESSAGES: Record<string, string> = {
  CUSTOMER_UPDATE_INVITATION_EXPIRED: "Este link expirou.",
  CUSTOMER_UPDATE_INVITATION_ALREADY_SUBMITTED:
    "Seus dados já foram atualizados, obrigado!",
  CUSTOMER_EMAIL_ALREADY_EXISTS:
    "Este e-mail já está em uso por outro cliente. Informe outro e-mail.",
}
const DEFAULT_SUBMIT_ERROR_MESSAGE =
  "Não foi possível atualizar seus dados. Tente novamente."

function submitErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.code) {
    return SUBMIT_ERROR_MESSAGES[err.code] ?? DEFAULT_SUBMIT_ERROR_MESSAGE
  }
  return DEFAULT_SUBMIT_ERROR_MESSAGE
}

interface CustomerUpdateFormProps {
  token: string
  organizationName: string
  customer: CustomerUpdateLookup["customer"]
  onSubmitted: () => void
}

function CustomerUpdateForm({
  token,
  organizationName,
  customer,
  onSubmitted,
}: CustomerUpdateFormProps) {
  const { mutateAsync: submit, isPending: submitting } =
    useSubmitCustomerUpdate(token)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const lastAppliedCepRef = React.useRef<string | null>(
    customer.postalCode ? customer.postalCode.replace(/\D/g, "") : null,
  )

  const { control, handleSubmit, formState, setValue } =
    useForm<CustomerUpdateFormValues>({
      resolver: zodResolver(customerUpdateSchema),
      defaultValues: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone ?? "",
        gender: "",
        birthDate: customer.birthDate,
        address: customer.address,
        addressLine2: customer.addressLine2 ?? "",
        number: customer.number,
        city: customer.city,
        state: customer.state,
        postalCode: customer.postalCode ?? "",
        country: customer.country ?? "",
      },
    })

  // `formState` é um Proxy: cada propriedade só passa a ser rastreada depois de
  // lida durante o render. `dirtyFields` só é consultado dentro do handler async
  // de submit (`buildPartialUpdateBody`), então sem esta leitura aqui ele nunca
  // seria ativado e chegaria sempre vazio no submit.
  const { dirtyFields } = formState

  async function handlePostalCodeChange(value: string) {
    const cepDigits = value.replace(/\D/g, "")
    if (cepDigits.length !== 8 || lastAppliedCepRef.current === cepDigits) {
      return
    }
    lastAppliedCepRef.current = cepDigits
    const result = await fetchAddressByCep(value)
    if (result) {
      // shouldDirty é obrigatório aqui: sem ele, o autopreenchimento por CEP não
      // marca address/city/state em `dirtyFields`, e o submit (que só envia
      // campos dirty) descartaria silenciosamente o endereço novo.
      if (result.address) {
        setValue("address", result.address, {
          shouldValidate: true,
          shouldDirty: true,
        })
      }
      if (result.city) {
        setValue("city", result.city, { shouldValidate: true, shouldDirty: true })
      }
      if (result.state) {
        setValue("state", result.state, { shouldValidate: true, shouldDirty: true })
      }
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null)
    const body = buildPartialUpdateBody(dirtyFields, values)
    try {
      await submit(body)
      onSubmitted()
    } catch (err) {
      setSubmitError(submitErrorMessage(err))
    }
  })

  return (
    <form onSubmit={(e) => void onSubmit(e)}>
      <CardHeader>
        <CardTitle className="text-xl">Atualize seus dados</CardTitle>
        <CardDescription className="text-foreground/40">
          {organizationName} solicita que você confirme ou atualize seus dados
          cadastrais.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
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
          {formState.errors.name && (
            <p className="text-xs text-destructive">
              {formState.errors.name.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>
            E-mail<span className="ml-1 text-destructive">*</span>
          </Label>
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <Input type="email" placeholder="voce@email.com" {...field} />
            )}
          />
          {formState.errors.email && (
            <p className="text-xs text-destructive">
              {formState.errors.email.message}
            </p>
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
          {formState.errors.phone && (
            <p className="text-xs text-destructive">
              {formState.errors.phone.message}
            </p>
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
            <p className="text-xs text-foreground/30">
              Deixado em &quot;Não informado&quot;, mantém o gênero já
              cadastrado.
            </p>
            {formState.errors.gender && (
              <p className="text-xs text-destructive">
                {formState.errors.gender.message}
              </p>
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
            {formState.errors.birthDate && (
              <p className="text-xs text-destructive">
                {formState.errors.birthDate.message}
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
                  void handlePostalCodeChange(e.target.value)
                }}
              />
            )}
          />
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
          {formState.errors.address && (
            <p className="text-xs text-destructive">
              {formState.errors.address.message}
            </p>
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
            {formState.errors.number && (
              <p className="text-xs text-destructive">
                {formState.errors.number.message}
              </p>
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
              render={({ field }) => (
                <Input placeholder="Ex: São Paulo" {...field} />
              )}
            />
            {formState.errors.city && (
              <p className="text-xs text-destructive">
                {formState.errors.city.message}
              </p>
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
            {formState.errors.state && (
              <p className="text-xs text-destructive">
                {formState.errors.state.message}
              </p>
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
          disabled={submitting}
        >
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar atualização
        </Button>
      </CardFooter>
    </form>
  )
}

interface CustomerUpdatePublicPageProps {
  token: string | undefined
}

export function CustomerUpdatePublicPage({ token }: CustomerUpdatePublicPageProps) {
  const {
    data: lookup,
    isLoading,
    error,
    isFetching,
    refetch,
  } = useCustomerUpdateLookup(token)
  const [submitted, setSubmitted] = React.useState(false)

  if (isLoading) return <PublicFormSpinner />

  if (!token || error || !lookup) {
    const state =
      token && error
        ? resolvePublicLookupErrorState(error, UPDATE_ERROR_CODES)
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
          title="Dados já atualizados"
          description="Seus dados já foram atualizados, obrigado!"
        />
      )
    }
    if (state === "error") {
      return (
        <PublicFormMessageCard
          title="Não foi possível carregar"
          description="Não foi possível carregar seus dados. Tente novamente."
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
        description="Este link de atualização não é válido."
      />
    )
  }

  if (submitted || lookup.status === "submitted") {
    return (
      <PublicFormMessageCard
        title="Dados atualizados!"
        description="Suas informações foram atualizadas com sucesso."
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

  return (
    <PublicFormCentered>
      <CustomerUpdateForm
        token={token}
        organizationName={lookup.organizationName}
        customer={lookup.customer}
        onSubmitted={() => setSubmitted(true)}
      />
    </PublicFormCentered>
  )
}
