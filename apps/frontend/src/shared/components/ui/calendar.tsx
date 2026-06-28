"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  CustomComponents,
  DayPicker,
  getDefaultClassNames,
} from "react-day-picker";
import { ptBR } from "date-fns/locale";
import { cn } from "@/shared/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

type DropdownProps = React.ComponentProps<"select"> & {
  options?: { value: number; label: string; disabled: boolean }[];
};

function Dropdown({
  options = [],
  value,
  onChange,
  "aria-label": ariaLabel,
}: DropdownProps) {
  const current = value !== undefined ? String(value) : undefined;

  const onValueChange = (v: string) => {
    onChange?.({
      target: { value: v },
    } as unknown as React.ChangeEvent<HTMLSelectElement>);
  };

  return (
    <Select value={current} onValueChange={onValueChange}>
      <SelectTrigger
        aria-label={ariaLabel}
        className="h-8 w-auto gap-1 px-2 text-sm font-medium capitalize shadow-none z-1"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-60">
        {options.map((o) => (
          <SelectItem
            key={o.value}
            value={String(o.value)}
            disabled={o.disabled}
            className="capitalize"
          >
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

type ChevronProps = {
  className?: string;
  style?: React.CSSProperties;
  size?: number;
  disabled?: boolean;
  orientation?: "up" | "down" | "left" | "right";
};

function Chevron({ orientation }: ChevronProps) {
  if (orientation === "left") return <ChevronLeft className="h-4 w-4" />;
  return <ChevronRight className="h-4 w-4" />;
}

const components: Partial<CustomComponents> = {
  Chevron,
  Dropdown,
};

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const d = getDefaultClassNames();
  return (
    <DayPicker
      locale={ptBR}
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        ...d,
        root: cn(d.root, "w-fit"),
        months: cn(d.months, "relative flex flex-col"),
        month: cn(d.month, "space-y-3"),
        month_caption: cn(
          d.month_caption,
          "flex h-8 items-center justify-center",
        ),
        // Hidden because we always render the month/year dropdowns (captionLayout="dropdown").
        caption_label: cn(d.caption_label, "hidden"),
        dropdowns: cn(d.dropdowns, "flex items-center justify-center gap-1.5"),
        dropdown_root: cn(d.dropdown_root, "relative"),
        nav: cn(
          d.nav,
          "absolute inset-x-0 top-0 flex items-center justify-between px-1",
        ),
        button_previous: cn(
          d.button_previous,
          "inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground/60 transition-colors hover:bg-foreground/10 hover:text-foreground",
        ),
        button_next: cn(
          d.button_next,
          "inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground/60 transition-colors hover:bg-foreground/10 hover:text-foreground",
        ),
        month_grid: cn(d.month_grid, "w-full border-collapse"),
        weekdays: cn(d.weekdays, "flex"),
        weekday: cn(d.weekday, "w-9 text-[0.7rem] font-normal text-foreground/30"),
        week: cn(d.week, "mt-1 flex w-full"),
        day: cn(d.day, "h-9 w-9 p-0 text-center text-sm"),
        day_button: cn(
          d.day_button,
          "inline-flex h-9 w-9 items-center justify-center rounded-md font-normal text-foreground/80 transition-colors hover:bg-foreground/10",
        ),
        today: cn(d.today, "font-semibold text-orange-400"),
        selected: cn(
          d.selected,
          "[&>button]:bg-orange-500 [&>button]:text-white [&>button:hover]:bg-orange-500",
        ),
        outside: cn(d.outside, "text-foreground/20"),
        disabled: cn(d.disabled, "text-foreground/10 opacity-50"),
        hidden: cn(d.hidden, "invisible"),
        ...classNames,
      }}
      components={components}
      {...props}
    />
  );
}

export { Calendar };
