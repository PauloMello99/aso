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
import {
  adjustStockSchema,
  type AdjustStockFormValues,
} from "../schemas/stock.schemas";
import type { Material } from "../types";

/** Allow digits and a single decimal separator only. */
function sanitizeQuantity(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const [int = "", ...rest] = cleaned.split(".");
  return rest.length ? `${int}.${rest.join("")}` : int;
}

interface AdjustStockFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: Material | null;
  onSubmit: (values: AdjustStockFormValues) => Promise<void>;
}

export function AdjustStockForm({
  open,
  onOpenChange,
  material,
  onSubmit,
}: AdjustStockFormProps) {
  const form = useForm<AdjustStockFormValues>({
    resolver: zodResolver(adjustStockSchema),
    defaultValues: { direction: "remove", quantity: "", note: "" },
  });

  useEffect(() => {
    if (open) form.reset({ direction: "remove", quantity: "", note: "" });
  }, [open, form]);

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
              <SheetTitle>Ajustar estoque</SheetTitle>
              <SheetDescription>
                {material ? (
                  <>
                    Corrija a quantidade de{" "}
                    <span className="font-medium text-foreground">
                      {material.name}
                    </span>
                    . Estoque atual:{" "}
                    <span className="font-medium text-foreground">
                      {parseFloat(material.stockQuantity).toLocaleString(
                        "pt-BR",
                      )}
                    </span>
                  </>
                ) : (
                  "Ajuste manual do estoque — perdas, correções ou descarte."
                )}
              </SheetDescription>
            </SheetHeader>

            <SheetBody className="flex flex-col gap-4 py-6">
              <div className="grid grid-cols-[140px_1fr] gap-3">
                <FormField
                  control={form.control}
                  name="direction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Operação</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="remove">Remoção (−)</SelectItem>
                          <SelectItem value="add">Adição (+)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Quantidade <span className="text-red-400">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: 5"
                          inputMode="decimal"
                          autoComplete="off"
                          autoFocus
                          {...field}
                          onChange={(e) =>
                            field.onChange(sanitizeQuantity(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormDescription className="-mt-2">
                Escolha remover (perda/descarte) ou adicionar (correção) e informe
                apenas o número.
              </FormDescription>

              <div>
                <FormField
                  control={form.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Motivo{" "}
                        <span className="text-xs text-foreground/30">
                          (recomendado)
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Ex: Descarte por validade expirada"
                          rows={2}
                          {...field}
                        />
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
                {form.formState.isSubmitting ? "Salvando…" : "Aplicar ajuste"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
