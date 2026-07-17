"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"
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
import { DatePicker } from "@/shared/components/ui/date-picker"
import { centsToReaisInput } from "@/features/cashier/lib/money"
import type { Customer } from "@/features/clients/types"
import type { Member } from "@/features/organizations/types"
import type { Material } from "@/features/stock/types"
import type { MaterialFormValues } from "@/features/stock/schemas/stock.schemas"
import {
  createServiceSchema,
  serviceSchema,
  type ServiceFormValues,
} from "../schemas/services.schemas"
import {
  SERVICE_PAYMENT_METHODS,
  SERVICE_PAYMENT_METHOD_LABELS,
  type Service,
  type ServiceType,
} from "../types"
import { MaterialLines } from "./material-lines"
import { ServiceTypeDialog } from "./service-type-dialog"

const TYPE_NONE = "none"
const TYPE_CREATE = "__create__"

function emptyValues(): ServiceFormValues {
  return {
    customerId: "",
    serviceTypeId: "",
    performedBy: "",
    description: "",
    amount: "",
    paymentMethod: "cash",
    paymentStatus: "paid",
    performedAt: "",
    materials: [],
  }
}

interface ServiceFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Quando presente, é edição (só campos não-financeiros). */
  service?: Service | null
  isOwner: boolean
  customers: Customer[]
  members: Member[]
  serviceTypes: ServiceType[]
  materials: Material[]
  onCreateType: (name: string) => Promise<ServiceType>
  /** Cria um material a partir do form de serviço (modal reusa o MaterialForm). */
  onCreateMaterial: (values: MaterialFormValues) => Promise<Material>
  onSubmit: (values: ServiceFormValues) => Promise<void>
}

export function ServiceForm({
  open,
  onOpenChange,
  service,
  isOwner,
  customers,
  members,
  serviceTypes,
  materials,
  onCreateType,
  onCreateMaterial,
  onSubmit,
}: ServiceFormProps) {
  const isEdit = !!service
  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(isEdit ? serviceSchema : createServiceSchema),
    defaultValues: emptyValues(),
  })

  const [typeDialogOpen, setTypeDialogOpen] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setSubmitError(null)
    if (service) {
      form.reset({
        customerId: service.customerId ?? "",
        serviceTypeId: service.serviceTypeId ?? "",
        performedBy: service.performedBy ?? "",
        description: service.description ?? "",
        amount: centsToReaisInput(service.amountCents),
        paymentMethod: service.paymentMethod,
        paymentStatus: service.paymentTransactionId ? "paid" : "pending",
        performedAt: service.performedAt ? service.performedAt.slice(0, 10) : "",
        materials: [],
      })
    } else {
      form.reset(emptyValues())
    }
  }, [open, service, form])

  const handleSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null)
    try {
      await onSubmit(values)
      onOpenChange(false)
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Falha ao lançar o serviço.",
      )
    }
  })

  const activeMembers = members.filter((m) => m.enabled)

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gap-0 sm:max-w-lg">
        <Form {...form}>
          <form onSubmit={handleSubmit} className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle>
                {isEdit ? "Editar serviço" : "Novo serviço"}
              </SheetTitle>
              <SheetDescription>
                {isEdit
                  ? "Edite os dados do atendimento (valor e pagamento não mudam aqui)."
                  : "Registre um atendimento: cliente, materiais e pagamento."}
              </SheetDescription>
            </SheetHeader>

            <SheetBody className="flex flex-col gap-6 py-6">
              {/* ── Seção: Dados do serviço ───────────────────────── */}
              <section className="flex flex-col gap-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/40">
                  Dados
                </h3>

                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Cliente <span className="text-red-400">*</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o cliente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
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

                {/* Profissional: só owner escolhe; funcionário lança para si. */}
                {isOwner && (
                  <FormField
                    control={form.control}
                    name="performedBy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Profissional</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Eu mesmo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
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
                  name="serviceTypeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Tipo de serviço{" "}
                        <span className="text-xs text-foreground/30">(opcional)</span>
                      </FormLabel>
                      <Select
                        value={field.value || TYPE_NONE}
                        onValueChange={(v) => {
                          if (v === TYPE_CREATE) {
                            // Defer p/ o Select fechar antes do Dialog abrir
                            // (evita corrida de foco entre os dois portais Radix).
                            setTimeout(() => setTypeDialogOpen(true), 0)
                            return
                          }
                          field.onChange(v === TYPE_NONE ? "" : v)
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sem tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {/* Primeira opção: criar um novo tipo (abre modal). */}
                          <SelectItem value={TYPE_CREATE}>
                            <span className="flex items-center gap-2 text-orange-400">
                              <Plus className="h-4 w-4" />
                              Criar novo tipo
                            </span>
                          </SelectItem>
                          <SelectItem value={TYPE_NONE}>Sem tipo</SelectItem>
                          {serviceTypes.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
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
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Descrição{" "}
                        <span className="text-xs text-foreground/30">(opcional)</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Detalhes do atendimento…"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="performedAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Data de execução{" "}
                        <span className="text-xs text-foreground/30">(opcional)</span>
                      </FormLabel>
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
              </section>

              {/* ── Seção: Materiais (só no lançamento) ───────────── */}
              {!isEdit && (
                <section className="flex flex-col gap-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/40">
                    Materiais consumidos
                  </h3>
                  <MaterialLines
                    materials={materials}
                    onCreateMaterial={onCreateMaterial}
                  />
                  {form.formState.errors.materials?.message && (
                    <p className="text-sm text-red-400">
                      {form.formState.errors.materials.message}
                    </p>
                  )}
                </section>
              )}

              {/* ── Seção: Pagamento (só no lançamento) ───────────── */}
              {!isEdit && (
                <section className="flex flex-col gap-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/40">
                    Pagamento
                  </h3>

                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Valor <span className="text-red-400">*</span>
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground/40">
                              R$
                            </span>
                            <Input
                              placeholder="0,00"
                              inputMode="decimal"
                              autoComplete="off"
                              className="pl-9"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Método de pagamento</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SERVICE_PAYMENT_METHODS.map((m) => (
                              <SelectItem key={m} value={m}>
                                {SERVICE_PAYMENT_METHOD_LABELS[m]}
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
                    name="paymentStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Situação</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="paid">
                              Pago (lança no caixa)
                            </SelectItem>
                            <SelectItem value="pending">Pendente</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </section>
              )}

              {submitError && (
                <p className="text-sm text-red-400">{submitError}</p>
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
                {form.formState.isSubmitting
                  ? "Salvando…"
                  : isEdit
                    ? "Salvar"
                    : "Lançar serviço"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>

      {/* Item 4 — criar tipo de serviço numa modal, sem sair do form. */}
      <ServiceTypeDialog
        open={typeDialogOpen}
        onOpenChange={setTypeDialogOpen}
        onCreate={onCreateType}
        onCreated={(type) =>
          // Defer p/ a option recém-cacheada já estar no seletor quando o valor
          // controlado mudar (senão o Radix Select ignora um value sem item).
          setTimeout(() => form.setValue("serviceTypeId", type.id), 0)
        }
      />
    </>
  )
}
