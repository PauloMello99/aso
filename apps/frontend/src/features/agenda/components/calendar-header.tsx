"use client"

import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Button } from "@/shared/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { useCalendar } from "../context/calendar-context"
import type { CalendarView } from "../types"

const VIEW_LABEL: Record<CalendarView, string> = {
  day: "Dia",
  week: "Semana",
  month: "Mês",
}

function periodLabel(view: CalendarView, start: Date, end: Date, current: Date) {
  if (view === "day") return format(current, "EEEE, d 'de' MMMM", { locale: ptBR })
  if (view === "month") return format(current, "MMMM 'de' yyyy", { locale: ptBR })
  // week
  return `${format(start, "d MMM", { locale: ptBR })} – ${format(end, "d MMM yyyy", { locale: ptBR })}`
}

interface CalendarHeaderProps {
  onNew: () => void
  /** Slot extra para o filtro de membro (apenas admin). */
  filterSlot?: React.ReactNode
}

export function CalendarHeader({ onNew, filterSlot }: CalendarHeaderProps) {
  const { view, setView, current, range, goNext, goPrev, goToday } = useCalendar()

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={goPrev} title="Anterior">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={goToday}>
          Hoje
        </Button>
        <Button variant="ghost" size="icon" onClick={goNext} title="Próximo">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="ml-1 text-sm font-medium capitalize text-foreground">
          {periodLabel(view, range.start, range.end, current)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {filterSlot}
        <Select value={view} onValueChange={(v) => setView(v as CalendarView)}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["day", "week", "month"] as CalendarView[]).map((v) => (
              <SelectItem key={v} value={v}>
                {VIEW_LABEL[v]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={onNew} className="shrink-0">
          <Plus className="h-4 w-4" />
          Novo
        </Button>
      </div>
    </div>
  )
}
