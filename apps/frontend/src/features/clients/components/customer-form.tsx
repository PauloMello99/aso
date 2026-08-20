"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { PhoneInput } from "@/shared/components/ui/phone-input";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { Separator } from "@/shared/components/ui/separator";
import {
  customerSchema,
  type CustomerFormValues,
} from "../schemas/client.schemas";
import { fetchAddressByCep } from "@/shared/lib/viacep";
import type { Customer } from "../types";
import { AttachmentsSection } from "./attachments-section";

interface CustomerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  customer?: Customer | null;
  origins?: { id: string; name: string }[];
  onSubmit: (values: CustomerFormValues) => Promise<void>;
}

const GENDER_NONE = "none";
const ORIGIN_NONE = "none";

const EMPTY: CustomerFormValues = {
  name: "",
  email: "",
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
  originId: "",
  notes: "",
};

export function CustomerForm({
  open,
  onOpenChange,
  orgId,
  customer,
  origins = [],
  onSubmit,
}: CustomerFormProps) {
  const isEditing = !!customer;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const lastAppliedCepRef = useRef<string | null>(null);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (open) {
      setSubmitError(null);
      lastAppliedCepRef.current = customer?.postalCode
        ? customer.postalCode.replace(/\D/g, "")
        : null;
      form.reset(
        customer
          ? {
              name: customer.name,
              email: customer.email ?? "",
              phone: customer.phone ?? "",
              gender: customer.gender ?? "",
              birthDate: customer.birthDate ?? "",
              address: customer.address ?? "",
              addressLine2: customer.addressLine2 ?? "",
              number: customer.number ?? "",
              city: customer.city ?? "",
              state: customer.state ?? "",
              postalCode: customer.postalCode ?? "",
              country: customer.country ?? "",
              originId: customer.originId ?? "",
              notes: customer.notes ?? "",
            }
          : EMPTY,
      );
    }
  }, [open, customer, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Falha ao salvar o cliente.",
      );
    }
  });

  const handlePostalCodeChange = async (value: string) => {
    const cepDigits = value.replace(/\D/g, "");
    if (cepDigits.length !== 8 || lastAppliedCepRef.current === cepDigits) {
      return;
    }
    lastAppliedCepRef.current = cepDigits;
    const result = await fetchAddressByCep(value);
    if (result) {
      if (result.address)
        form.setValue("address", result.address, { shouldValidate: true });
      if (result.city)
        form.setValue("city", result.city, { shouldValidate: true });
      if (result.state)
        form.setValue("state", result.state, { shouldValidate: true });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gap-0 sm:max-w-lg">
        <Form {...form}>
          <form onSubmit={handleSubmit} className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle>
                {isEditing ? "Editar cliente" : "Novo cliente"}
              </SheetTitle>
              <SheetDescription>
                {isEditing
                  ? "Atualize os dados do cliente."
                  : "Adicione um cliente ao cadastro da sua organização."}
              </SheetDescription>
            </SheetHeader>

            <SheetBody className="flex flex-col gap-4 py-6">
              <div>
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
                          placeholder="Ex: Mariana Souza"
                          autoComplete="off"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
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
                          type="email"
                          placeholder="cliente@email.com"
                          autoComplete="off"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {submitError && (
                  <p className="mt-1 text-sm text-destructive">{submitError}</p>
                )}
              </div>

              <div>
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <PhoneInput
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gênero</FormLabel>
                        <Select
                          value={field.value ? field.value : GENDER_NONE}
                          onValueChange={(v: string) =>
                            field.onChange(v === GENDER_NONE ? "" : v)
                          }
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Não informado" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={GENDER_NONE}>
                              Não informado
                            </SelectItem>
                            <SelectItem value="female">Feminino</SelectItem>
                            <SelectItem value="male">Masculino</SelectItem>
                            <SelectItem value="other">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div>
                  <FormField
                    control={form.control}
                    name="birthDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>
                          Nascimento <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <DatePicker
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="dd/mm/aaaa"
                            align="end"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator className="bg-foreground/[0.06]" />
              <p className="-mb-1 text-xs font-medium uppercase tracking-wider text-foreground/30">
                Endereço
              </p>

              <FormField
                control={form.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEP / Código postal</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: 01310-100"
                        autoComplete="off"
                        {...field}
                        onBlur={(e) => {
                          field.onBlur();
                          void handlePostalCodeChange(e.target.value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Logradouro <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Rua, avenida"
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Número <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: 123"
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
                  name="addressLine2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Complemento</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Apto, bloco, referência"
                          autoComplete="off"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Cidade <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: São Paulo"
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
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Estado / Província{" "}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: SP"
                          autoComplete="off"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>País (ISO)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="BR"
                        autoComplete="off"
                        maxLength={2}
                        className="uppercase"
                        {...field}
                        onChange={(e) =>
                          field.onChange(e.target.value.toUpperCase())
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator className="bg-foreground/[0.06]" />

              <FormField
                control={form.control}
                name="originId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Origem{" "}
                      <span className="text-xs text-foreground/30">(opcional)</span>
                    </FormLabel>
                    <Select
                      value={field.value || ORIGIN_NONE}
                      onValueChange={(v) =>
                        field.onChange(v === ORIGIN_NONE ? "" : v)
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Como conheceu o estúdio?" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={ORIGIN_NONE}>Não informado</SelectItem>
                        {origins.map((o) => (
                          <SelectItem key={o.id} value={o.id}>
                            {o.name}
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
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Observações{" "}
                      <span className="text-xs text-foreground/30">(opcional)</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Notas internas, preferências, restrições…"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isEditing && customer && (
                <>
                  <Separator className="bg-foreground/[0.06]" />
                  <AttachmentsSection orgId={orgId} customerId={customer.id} />
                </>
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
                  : isEditing
                    ? "Salvar alterações"
                    : "Criar cliente"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
