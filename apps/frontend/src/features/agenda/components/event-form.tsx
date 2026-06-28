"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format, parseISO } from "date-fns"
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
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"
import { Switch } from "@/shared/components/ui/switch"
import { Trash2 } from "lucide-react"
import { useCustomers } from "@/features/clients/hooks/use-customers"
import { eventFormSchema, type EventFormValues } from "../schemas/agenda.schemas"
import type { CalendarEvent } from "../types"
import type { CalendarEventBody } from "../hooks/use-calendar-events"
import { DatePicker } from "@/shared/components/ui/date-picker"
import type { Member } from "@/features/organizations/types"

const NO_CUSTOMER = "none"
const ASSIGNEE_SELF = "self"

interface EventFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string
  /** Evento em edição, ou null para criação. */
  event: CalendarEvent | null
  /** Slot inicial ao criar (clicar num horário do grid). */
  defaultSlot?: { date: string; startTime: string; endTime: string } | null
  /** Somente leitura (ex.: admin vendo evento de outro membro). */
  readOnly?: boolean
  /** Nome do membro dono do evento (exibido em modo leitura). */
  ownerName?: string | null
  /** Owner pode criar em nome de um membro; funcionário não vê o seletor. */
  isOwner?: boolean
  members?: Member[]
  onSubmit: (body: CalendarEventBody, id?: string) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  onSetStatus?: (id: string, status: "scheduled" | "canceled") => Promise<void>
}

function emptyValues(slot?: EventFormProps["defaultSlot"]): EventFormValues {
  return {
    type: "appointment",
    title: "",
    customerId: "",
    date: slot?.date ?? format(new Date(), "yyyy-MM-dd"),
    startTime: slot?.startTime ?? "09:00",
    endTime: slot?.endTime ?? "10:00",
    allDay: false,
    description: "",
    assignedTo: "",
  }
}

export function EventForm({
  open,
  onOpenChange,
  orgId,
  event,
  defaultSlot,
  readOnly = false,
  ownerName,
  isOwner = false,
  members = [],
  onSubmit,
  onDelete,
  onSetStatus,
}: EventFormProps) {
  const isEditing = !!event
  const isCanceled = event?.status === "canceled"
  const { customers } = useCustomers(orgId, { enabledOnly: true })
  const activeMembers = members.filter((m) => m.enabled)

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: emptyValues(defaultSlot),
  })

  const type = form.watch("type")
  const allDay = form.watch("allDay")

  useEffect(() => {
    if (!open) return
    if (event) {
      const s = parseISO(event.startsAt)
      const e = parseISO(event.endsAt)
      form.reset({
        type: event.type,
        title: event.title,
        customerId: event.customerId ?? "",
        date: format(s, "yyyy-MM-dd"),
        startTime: format(s, "HH:mm"),
        endTime: format(e, "HH:mm"),
        allDay: event.allDay,
        description: event.description ?? "",
        assignedTo: event.assignedTo ?? "",
      })
    } else {
      form.reset(emptyValues(defaultSlot))
    }
  }, [open, event, defaultSlot, form])

  const handleSubmit = form.handleSubmit(async (v) => {
    const startsAt = v.allDay
      ? new Date(`${v.date}T00:00:00`)
      : new Date(`${v.date}T${v.startTime}:00`)
    const endsAt = v.allDay
      ? new Date(`${v.date}T23:59:59`)
      : new Date(`${v.date}T${v.endTime}:00`)

    const body: CalendarEventBody = {
      type: v.type,
      title: v.title,
      description: v.description || null,
      customerId:
        v.type === "appointment" && v.customerId && v.customerId !== NO_CUSTOMER
          ? v.customerId
          : null,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      allDay: v.allDay ?? false,
      // Só relevante na criação; o owner pode atribuir a outro membro.
      assignedTo: v.assignedTo || null,
    }
    await onSubmit(body, event?.id)
    onOpenChange(false)
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gap-0 sm:max-w-md">
        <Form {...form}>
          <form onSubmit={handleSubmit} className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle>
                {readOnly ? "Evento" : isEditing ? "Editar evento" : "Novo evento"}
              </SheetTitle>
              <SheetDescription>
                {readOnly
                  ? `Agenda de ${ownerName ?? "outro membro"} — somente leitura.`
                  : type === "unavailability"
                    ? "Bloqueie um horário/dia em que você não pode atender."
                    : "Marque um atendimento na sua agenda."}
              </SheetDescription>
            </SheetHeader>

            <SheetBody className="py-6">
              <fieldset
                disabled={readOnly}
                className="m-0 grid gap-4 border-0 p-0 disabled:opacity-90"
              >
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="appointment">Atendimento</SelectItem>
                        <SelectItem value="unavailability">
                          Indisponibilidade
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Owner: criar evento em nome de um membro (só na criação). */}
              {isOwner && !isEditing && (
                <FormField
                  control={form.control}
                  name="assignedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Para o membro{" "}
                        <span className="text-xs text-foreground/30">(opcional)</span>
                      </FormLabel>
                      <Select
                        value={field.value || ASSIGNEE_SELF}
                        onValueChange={(v) =>
                          field.onChange(v === ASSIGNEE_SELF ? "" : v)
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Eu mesmo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={ASSIGNEE_SELF}>Eu mesmo</SelectItem>
                          {activeMembers.map((m) => (
                            <SelectItem key={m.userId} value={m.userId}>
                              {m.userName}
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
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Título <span className="text-red-400">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={
                          type === "unavailability"
                            ? "Ex: Folga, Almoço"
                            : "Ex: Tatuagem - braço"
                        }
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {type === "appointment" && (
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente</FormLabel>
                      <Select
                        value={field.value || NO_CUSTOMER}
                        onValueChange={(v) =>
                          field.onChange(v === NO_CUSTOMER ? "" : v)
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sem cliente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NO_CUSTOMER}>Sem cliente</SelectItem>
                          {customers.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
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
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Hoje"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="allDay"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4 rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] p-3">
                    <FormLabel>Dia inteiro</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value ?? false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {!allDay && (
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Início</FormLabel>
                        <FormControl>
                          <Input type="time" step={300} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fim</FormLabel>
                        <FormControl>
                          <Input type="time" step={300} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Observações{" "}
                      <span className="text-xs text-foreground/30">(opcional)</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              </fieldset>
            </SheetBody>

            {readOnly ? (
              <SheetFooter>
                <SheetClose asChild>
                  <Button type="button" variant="outline" className="w-full sm:w-auto">
                    Fechar
                  </Button>
                </SheetClose>
              </SheetFooter>
            ) : (
            <SheetFooter className="sm:justify-between">
              {isEditing ? (
                <div className="flex gap-1">
                  {onSetStatus && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-foreground/60 hover:text-foreground"
                      onClick={async () => {
                        if (!event) return
                        await onSetStatus(
                          event.id,
                          isCanceled ? "scheduled" : "canceled",
                        )
                        onOpenChange(false)
                      }}
                    >
                      {isCanceled ? "Reativar" : "Cancelar evento"}
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      onClick={async () => {
                        if (!event) return
                        await onDelete(event.id)
                        onOpenChange(false)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir
                    </Button>
                  )}
                </div>
              ) : (
                <span />
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <SheetClose asChild>
                  <Button type="button" variant="outline" className="w-full sm:w-auto">
                    Cancelar
                  </Button>
                </SheetClose>
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  className="w-full sm:w-auto"
                >
                  {form.formState.isSubmitting
                    ? "Salvando…"
                    : isEditing
                      ? "Salvar"
                      : "Criar"}
                </Button>
              </div>
            </SheetFooter>
            )}
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
