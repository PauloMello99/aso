"use client"

import * as React from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Cake,
  History,
  Loader2,
  Lock,
  RefreshCw,
  UserRoundCheck,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Textarea } from "@/shared/components/ui/textarea"
import { Switch } from "@/shared/components/ui/switch"
import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { cn } from "@/shared/lib/utils"
import { useCurrentOrg } from "@/features/dashboard/components/org-context"
import {
  useCampaignSettings,
  useUpdateCampaignSettings,
} from "../hooks/use-campaign-settings"
import {
  campaignSettingsSchema,
  type CampaignSettingsFormValues,
} from "../schemas/campaign-settings.schema"
import {
  CAMPAIGN_FOOTER_LEGAL_NOTE,
  CAMPAIGN_FOOTER_UNSUBSCRIBE_LINE,
  OWNER_TRIGGER_LABELS,
  campaignFooterExample,
  interpolateCampaignCopy,
} from "../lib/campaign-copy-preview"
import type { CampaignSettings, CampaignTrigger } from "../types"

const PREPARING_NOTICE =
  "As campanhas só começam a ser enviadas quando o recurso for liberado para a sua organização. Você já pode deixar tudo configurado abaixo."

const INACTIVITY_MONTH_OPTIONS = [3, 6, 9, 12, 18, 24] as const

const SUBJECT_MAX = 200
const BODY_MAX = 5000

interface TriggerMeta {
  trigger: CampaignTrigger
  icon: LucideIcon
  description: (months: number) => string
  enabledField: "postServiceEnabled" | "birthdayEnabled" | "inactivityEnabled"
  subjectField: "postServiceSubject" | "birthdaySubject" | "inactivitySubject"
  bodyField: "postServiceBody" | "birthdayBody" | "inactivityBody"
}

const TRIGGERS: TriggerMeta[] = [
  {
    trigger: "post_service",
    icon: UserRoundCheck,
    description: () => "Enviado 1 a 2 dias após um atendimento concluído.",
    enabledField: "postServiceEnabled",
    subjectField: "postServiceSubject",
    bodyField: "postServiceBody",
  },
  {
    trigger: "birthday",
    icon: Cake,
    description: () => "Enviado no dia do aniversário do cliente.",
    enabledField: "birthdayEnabled",
    subjectField: "birthdaySubject",
    bodyField: "birthdayBody",
  },
  {
    trigger: "inactivity",
    icon: History,
    description: (months) =>
      `Enviado quando o cliente fica ${months} meses sem nenhum atendimento.`,
    enabledField: "inactivityEnabled",
    subjectField: "inactivitySubject",
    bodyField: "inactivityBody",
  },
]

function toFormValues(s: CampaignSettings): CampaignSettingsFormValues {
  return {
    postServiceEnabled: s.postServiceEnabled,
    birthdayEnabled: s.birthdayEnabled,
    inactivityEnabled: s.inactivityEnabled,
    inactivityMonths: s.inactivityMonths,
    postServiceSubject: s.postServiceSubject ?? "",
    postServiceBody: s.postServiceBody ?? "",
    birthdaySubject: s.birthdaySubject ?? "",
    birthdayBody: s.birthdayBody ?? "",
    inactivitySubject: s.inactivitySubject ?? "",
    inactivityBody: s.inactivityBody ?? "",
  }
}

export function CampaignSettingsPage() {
  const { org, orgId } = useCurrentOrg()
  const isOwner = org.role === "owner"
  const { settings, loading, isFetching, error, refetch } =
    useCampaignSettings(orgId)

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-lg font-semibold">Campanhas de e-mail</h1>
        <p className="mt-0.5 text-sm text-foreground/50">
          E-mails automáticos enviados aos seus clientes em datas e situações
          específicas.
        </p>
      </div>

      {settings?.campaignsEnabled === false && (
        <Alert>
          <AlertDescription>{PREPARING_NOTICE}</AlertDescription>
        </Alert>
      )}

      {!isOwner ? (
        <div className="flex items-center gap-2 rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] p-4 text-sm text-foreground/50">
          <Lock className="h-4 w-4 shrink-0" />
          Apenas proprietários podem configurar as campanhas de e-mail.
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-12 text-foreground/40">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Carregando…
        </div>
      ) : error || !settings ? (
        <div className="grid gap-3">
          <Alert variant="destructive">
            <AlertDescription>
              Não foi possível carregar as configurações de campanhas.
            </AlertDescription>
          </Alert>
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            <RefreshCw
              className={cn("mr-2 h-4 w-4", isFetching && "animate-spin")}
            />
            Tentar novamente
          </Button>
        </div>
      ) : (
        <CampaignSettingsForm
          orgId={orgId}
          orgName={org.name}
          settings={settings}
        />
      )}
    </div>
  )
}

interface CampaignSettingsFormProps {
  orgId: string
  orgName: string
  settings: CampaignSettings
}

function CampaignSettingsForm({
  orgId,
  orgName,
  settings,
}: CampaignSettingsFormProps) {
  const { updateSettings } = useUpdateCampaignSettings(orgId)
  const [saved, setSaved] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)

  const { control, handleSubmit, watch, setValue, reset, formState } =
    useForm<CampaignSettingsFormValues>({
      resolver: zodResolver(campaignSettingsSchema),
      defaultValues: toFormValues(settings),
    })
  const { errors, isDirty, isSubmitting } = formState

  const watched = watch()

  const onSubmit = handleSubmit(async (values) => {
    setSaved(false)
    setSaveError(null)
    try {
      const updated = await updateSettings(values)
      reset(toFormValues(updated))
      setSaved(true)
    } catch {
      setSaveError("Não foi possível salvar as alterações. Tente novamente.")
    }
  })

  function restoreDefault(meta: TriggerMeta) {
    setValue(meta.subjectField, "", { shouldDirty: true })
    setValue(meta.bodyField, "", { shouldDirty: true })
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="grid gap-6">
      {TRIGGERS.map((meta) => {
        const enabled = watched[meta.enabledField]
        const subjectValue = watched[meta.subjectField]
        const bodyValue = watched[meta.bodyField]
        const triggerDefaults = settings.defaults[meta.trigger]
        const Icon = meta.icon

        return (
          <section
            key={meta.trigger}
            className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <h3 className="text-sm font-medium text-foreground">
                    {OWNER_TRIGGER_LABELS[meta.trigger]}
                  </h3>
                  <p className="mt-0.5 text-sm text-foreground/50">
                    {meta.description(watched.inactivityMonths)}
                  </p>
                </div>
              </div>
              <Controller
                control={control}
                name={meta.enabledField}
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-label={`Ativar ${OWNER_TRIGGER_LABELS[meta.trigger]}`}
                  />
                )}
              />
            </div>

            {enabled && (
              <div className="mt-4 space-y-4 border-t border-foreground/[0.06] pt-4">
                {meta.trigger === "inactivity" && (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="inactivity-months">Enviar após</Label>
                    <Controller
                      control={control}
                      name="inactivityMonths"
                      render={({ field }) => (
                        <Select
                          value={String(field.value)}
                          onValueChange={(v) => field.onChange(Number(v))}
                        >
                          <SelectTrigger
                            id="inactivity-months"
                            className="sm:w-48"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {INACTIVITY_MONTH_OPTIONS.map((m) => (
                              <SelectItem key={m} value={String(m)}>
                                {m} meses
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.inactivityMonths && (
                      <p className="text-xs text-destructive">
                        {errors.inactivityMonths.message}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <Label>Assunto do e-mail</Label>
                  <Controller
                    control={control}
                    name={meta.subjectField}
                    render={({ field }) => (
                      <Input
                        maxLength={SUBJECT_MAX}
                        placeholder={triggerDefaults.subject}
                        {...field}
                      />
                    )}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-foreground/40">
                      Use {"{{customerName}}"} e {"{{orgName}}"} para
                      personalizar.
                    </p>
                    <span className="shrink-0 text-xs text-foreground/40">
                      {subjectValue.length}/{SUBJECT_MAX}
                    </span>
                  </div>
                  {errors[meta.subjectField] && (
                    <p className="text-xs text-destructive">
                      {errors[meta.subjectField]?.message}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Corpo do e-mail</Label>
                  <Controller
                    control={control}
                    name={meta.bodyField}
                    render={({ field }) => (
                      <Textarea rows={6} maxLength={BODY_MAX} {...field} />
                    )}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <DefaultTextDisclosure text={triggerDefaults.body} />
                    <span className="shrink-0 text-xs text-foreground/40">
                      {bodyValue.length}/{BODY_MAX}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => restoreDefault(meta)}
                    className="self-start text-xs text-primary hover:underline"
                  >
                    Restaurar texto padrão do ASO
                  </button>
                  {errors[meta.bodyField] && (
                    <p className="text-xs text-destructive">
                      {errors[meta.bodyField]?.message}
                    </p>
                  )}
                </div>

                <CampaignPreview
                  subject={subjectValue || triggerDefaults.subject}
                  body={bodyValue || triggerDefaults.body}
                  orgName={orgName}
                />
              </div>
            )}
          </section>
        )
      })}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        {saveError && (
          <Alert variant="destructive" className="sm:mr-auto">
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        )}
        {saved && !isDirty && (
          <span className="text-xs text-success sm:mr-auto">
            Alterações salvas.
          </span>
        )}
        <Button
          type="submit"
          className="w-full sm:w-auto"
          disabled={isSubmitting || !isDirty}
        >
          {isSubmitting ? "Salvando…" : "Salvar alterações"}
        </Button>
      </div>
    </form>
  )
}

function DefaultTextDisclosure({ text }: { text: string }) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-foreground/50 hover:text-foreground"
        aria-expanded={open}
      >
        {open ? "Ocultar texto padrão do ASO" : "Ver texto padrão do ASO"}
      </button>
      {open && (
        <p className="mt-2 whitespace-pre-line rounded-md border border-foreground/[0.06] bg-background/40 p-3 text-xs leading-relaxed text-foreground/60">
          {text}
        </p>
      )}
    </div>
  )
}

interface CampaignPreviewProps {
  subject: string
  body: string
  orgName: string
}

function CampaignPreview({ subject, body, orgName }: CampaignPreviewProps) {
  return (
    <div className="rounded-lg border border-foreground/[0.06] bg-background/40 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-foreground/30">
        Prévia
      </p>
      <p className="mt-2 text-sm font-medium text-foreground">
        Assunto: {interpolateCampaignCopy(subject, orgName)}
      </p>
      <p className="mt-1 whitespace-pre-line text-sm text-foreground/60">
        {interpolateCampaignCopy(body, orgName)}
      </p>
      <div className="mt-3 border-t border-foreground/[0.06] pt-3 text-xs text-foreground/40">
        <p>{campaignFooterExample(orgName)}</p>
        <p className="mt-0.5 underline">{CAMPAIGN_FOOTER_UNSUBSCRIBE_LINE}</p>
      </div>
      <p className="mt-2 text-xs text-foreground/30">
        {CAMPAIGN_FOOTER_LEGAL_NOTE}
      </p>
    </div>
  )
}
