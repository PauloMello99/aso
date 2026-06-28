"use client";

import { useEffect } from "react";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Switch } from "@/shared/components/ui/switch";
import {
  materialSchema,
  type MaterialFormValues,
} from "../schemas/stock.schemas";
import type { Material } from "../types";

interface MaterialFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material?: Material | null;
  onSubmit: (values: MaterialFormValues) => Promise<void>;
}

export function MaterialForm({
  open,
  onOpenChange,
  material,
  onSubmit,
}: MaterialFormProps) {
  const isEditing = !!material;

  const form = useForm<MaterialFormValues>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      name: "",
      shareable: false,
      minimumQuantity: "",
      costPerUnit: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        material
          ? {
              name: material.name,
              shareable: material.shareable,
              minimumQuantity:
                material.minimumQuantity === "0.00"
                  ? ""
                  : (material.minimumQuantity ?? ""),
              costPerUnit: material.costPerUnit ?? "",
            }
          : { name: "", shareable: false, minimumQuantity: "", costPerUnit: "" },
      );
    }
  }, [open, material, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values);
    onOpenChange(false);
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gap-0 sm:max-w-md">
        <Form {...form}>
          <form onSubmit={handleSubmit} className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle>
                {isEditing ? "Editar material" : "Novo material"}
              </SheetTitle>
              <SheetDescription>
                {isEditing
                  ? "Atualize os dados do material."
                  : "Adicione um material ao estoque da sua organização."}
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
                        Nome <span className="text-red-400">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Tinta preta, Agulha 3RL"
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
                  name="minimumQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Qtd. mínima</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: 5"
                          inputMode="decimal"
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
                  name="shareable"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between gap-4 rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Material compartilhável</FormLabel>
                        <FormDescription>
                          Não é consumido por inteiro a cada serviço — ex.: luvas.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <FormField
                  control={form.control}
                  name="costPerUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Custo por unidade{" "}
                        <span className="text-xs text-foreground/30">
                          (opcional)
                        </span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground/40">
                            R$
                          </span>
                          <Input
                            placeholder="0.00"
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
              </div>
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
                    : "Criar material"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
