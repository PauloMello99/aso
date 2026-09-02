"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet"
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
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import {
  createCampaignSchema,
  type Campaign,
  type CampaignBody,
  type CreateCampaignInput,
  type ListCampaignsResponse,
  type UpdateCampaignInput,
} from "../schemas/campaign.schema"
import { campaignErrorMessage } from "../lib/error-messages"
import { useUploadCampaignImage } from "../hooks/use-upload-campaign-image"
import { CampaignBodyEditor } from "./campaign-body-editor"
import type { CampaignTrigger } from "../types"

const TRIGGER_LABELS: Record<CampaignTrigger, string> = {
  post_service: "Pós-atendimento",
  birthday: "Aniversário",
  inactivity: "Inatividade",
}

/** Nome sugerido (prefill do campo `name`) por gatilho na criação. */
const SUGGESTED_NAMES: Record<CampaignTrigger, string> = {
  post_service: "Pós-atendimento",
  birthday: "Aniversário",
  inactivity: "Reengajamento",
}

const EMPTY_BODY: CampaignBody = { type: "doc", content: [] }
const EMPTY_TRIGGER_DEFAULT = { subject: "", body: EMPTY_BODY }

const DEFAULT_INACTIVITY_MONTHS = 6

interface CampaignSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string
  campaign: Campaign | null
  availableTriggers: CampaignTrigger[]
  defaults: ListCampaignsResponse["defaults"]
  onCreate: (input: CreateCampaignInput) => Promise<Campaign>
  onUpdate: (id: string, patch: UpdateCampaignInput) => Promise<Campaign>
}

export function CampaignSheet({
  open,
  onOpenChange,
  orgId,
  campaign,
  availableTriggers,
  defaults,
  onCreate,
  onUpdate,
}: CampaignSheetProps) {
  const isEdit = campaign !== null
  const { uploadImage, uploading } = useUploadCampaignImage(orgId)

  const form = useForm<CreateCampaignInput>({
    resolver: zodResolver(createCampaignSchema),
    defaultValues: {
      trigger: "post_service",
      name: "",
      subject: "",
      body: EMPTY_BODY,
      inactivityMonths: DEFAULT_INACTIVITY_MONTHS,
    },
  })

  useEffect(() => {
    if (!open) return
    if (campaign) {
      form.reset({
        trigger: campaign.trigger,
        name: campaign.name,
        subject: campaign.subject ?? "",
        inactivityMonths: campaign.inactivityMonths ?? DEFAULT_INACTIVITY_MONTHS,
        body: campaign.body ?? defaults[campaign.trigger]?.body ?? EMPTY_BODY,
      })
    } else {
      const first = availableTriggers[0] ?? "post_service"
      form.reset({
        trigger: first,
        name: SUGGESTED_NAMES[first],
        subject: "",
        inactivityMonths: DEFAULT_INACTIVITY_MONTHS,
        body: defaults[first]?.body ?? EMPTY_BODY,
      })
    }
  }, [open, campaign, availableTriggers, defaults, form])

  const trigger = form.watch("trigger")
  const triggerDefault = defaults[trigger] ?? EMPTY_TRIGGER_DEFAULT

  function handleTriggerChange(next: string) {
    const nextTrigger = next as CampaignTrigger
    const prevTrigger = form.getValues("trigger")
    const currentName = form.getValues("name")
    form.setValue("trigger", nextTrigger)
    if (currentName === "" || currentName === SUGGESTED_NAMES[prevTrigger]) {
      form.setValue("name", SUGGESTED_NAMES[nextTrigger])
    }
    form.setValue("body", defaults[nextTrigger]?.body ?? EMPTY_BODY)
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    const name = values.name.trim()
    const subject = values.subject?.trim() ? values.subject.trim() : null
    const body = values.body ?? null
    try {
      if (campaign) {
        await onUpdate(campaign.id, {
          name,
          subject,
          body,
          inactivityMonths:
            campaign.trigger === "inactivity"
              ? (values.inactivityMonths ?? null)
              : null,
        })
      } else {
        await onCreate({
          trigger: values.trigger,
          name,
          subject,
          body,
          inactivityMonths:
            values.trigger === "inactivity"
              ? (values.inactivityMonths ?? null)
              : null,
        })
      }
      onOpenChange(false)
    } catch (err) {
      form.setError("root", { message: campaignErrorMessage(err) })
    }
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gap-0 sm:max-w-md">
        <Form {...form}>
          <form onSubmit={handleSubmit} className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle>
                {isEdit ? "Gerenciar campanha" : "Nova campanha"}
              </SheetTitle>
              <SheetDescription>
                Um e-mail automático por gatilho. O texto é da sua organização.
              </SheetDescription>
            </SheetHeader>

            <SheetBody className="flex flex-col gap-4 py-6">
              {isEdit ? (
                <div className="grid gap-1.5">
                  <Label>Gatilho</Label>
                  <div>
                    <Badge variant="secondary">
                      {TRIGGER_LABELS[campaign.trigger]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    O gatilho não muda depois de criar a campanha.
                  </p>
                  <input type="hidden" {...form.register("trigger")} />
                </div>
              ) : (
                <FormField
                  control={form.control}
                  name="trigger"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gatilho</FormLabel>
                      <Select
                        onValueChange={handleTriggerChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableTriggers.map((t) => (
                            <SelectItem key={t} value={t}>
                              {TRIGGER_LABELS[t]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

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
                        maxLength={80}
                        autoComplete="off"
                        autoFocus
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Aparece só para você, na lista de campanhas.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assunto</FormLabel>
                    <FormControl>
                      <Input
                        maxLength={200}
                        autoComplete="off"
                        placeholder={triggerDefault.subject}
                        name={field.name}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        value={field.value ?? ""}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Deixe em branco para usar o assunto padrão do ASO.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {trigger === "inactivity" && (
                <FormField
                  control={form.control}
                  name="inactivityMonths"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Meses de inatividade{" "}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={36}
                          inputMode="numeric"
                          name={field.name}
                          ref={field.ref}
                          onBlur={field.onBlur}
                          value={field.value ?? ""}
                          onChange={(e) => {
                            const n = e.target.valueAsNumber
                            field.onChange(Number.isNaN(n) ? undefined : n)
                          }}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Enviar quando o cliente não retorna há esse número de
                        meses.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid gap-1.5">
                <Label>Conteúdo do e-mail</Label>
                <CampaignBodyEditor
                  value={form.watch("body") ?? triggerDefault.body}
                  onChange={(doc) =>
                    form.setValue("body", doc, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                  onLoadDefault={() =>
                    form.setValue("body", triggerDefault.body, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                  onUploadImage={uploadImage}
                  uploadingImage={uploading}
                />
                <p className="text-xs text-muted-foreground">
                  Escreva o texto do e-mail. O ASO cuida do cabeçalho, do rodapé
                  e do descadastro.
                </p>
              </div>

              {form.formState.errors.root && (
                <p
                  role="alert"
                  className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {form.formState.errors.root.message}
                </p>
              )}
            </SheetBody>

            <SheetFooter>
              <SheetClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  Cancelar
                </Button>
              </SheetClose>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="w-full sm:w-auto"
              >
                {form.formState.isSubmitting ? "Salvando…" : "Salvar"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
