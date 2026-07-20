"use client";

import * as React from "react";
import { format, isValid, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Calendar } from "@/shared/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { cn } from "@/shared/lib/utils";

interface DatePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  id?: string;
  placeholder?: string;
  className?: string;
  align?: "start" | "end" | "center";
}

export function DatePicker({
  value,
  onChange,
  id,
  placeholder = "Selecione uma data",
  className,
  align = "center",
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const parsed = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined;
  const selected = parsed && isValid(parsed) ? parsed : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start gap-2 font-normal",
            !selected && "text-foreground/40",
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 text-foreground/40" />
          {selected
            ? format(selected, "dd/MM/yyyy", { locale: ptBR })
            : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          captionLayout="dropdown"
          startMonth={new Date(1920, 0)}
          className="rounded-lg border"
          endMonth={new Date()}
          onSelect={(d) => {
            onChange?.(d ? format(d, "yyyy-MM-dd") : "");
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
