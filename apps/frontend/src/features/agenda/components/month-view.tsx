"use client"

import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/shared/lib/utils"
import type { CalendarEvent } from "../types"

const WEEK_OPTS = { weekStartsOn: 1 } as const
const WEEKDAYS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"]

interface MonthViewProps {
  current: Date
  events: CalendarEvent[]
  onDayClick: (date: string) => void
  onEventClick: (event: CalendarEvent) => void
}

export function MonthView({
  current,
  events,
  onDayClick,
  onEventClick,
}: MonthViewProps) {
  const gridStart = startOfWeek(startOfMonth(current), WEEK_OPTS)
  const gridEnd = endOfWeek(endOfMonth(current), WEEK_OPTS)
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })
  const today = new Date()

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.06]">
      <div className="grid grid-cols-7 border-b border-white/[0.06]">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="py-2 text-center text-[11px] uppercase text-white/40"
          >
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const inMonth = isSameMonth(day, current)
          const isToday = isSameDay(day, today)
          const dayEvents = events.filter((ev) =>
            isSameDay(parseISO(ev.startsAt), day),
          )
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onDayClick(format(day, "yyyy-MM-dd"))}
              className={cn(
                "flex min-h-[92px] aspect-square flex-col gap-1 border-b border-l border-white/[0.04] p-1.5 text-left align-top transition-colors hover:bg-white/[0.02]",
                !inMonth && "bg-white/[0.01]",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  isToday
                    ? "bg-orange-500 font-semibold text-white"
                    : inMonth
                      ? "text-white/70"
                      : "text-white/25",
                )}
              >
                {format(day, "d")}
              </span>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {dayEvents.slice(0, 3).map((ev) => (
                  <span
                    key={ev.id}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation()
                      onEventClick(ev)
                    }}
                    className={cn(
                      "truncate rounded px-1 py-0.5 text-[10px] leading-tight",
                      ev.type === "unavailability"
                        ? "bg-white/[0.06] text-white/50"
                        : "bg-orange-500/15 text-orange-200",
                      ev.status === "canceled" && "line-through opacity-40",
                    )}
                  >
                    {!ev.allDay && `${format(parseISO(ev.startsAt), "HH:mm")} `}
                    {ev.title}
                  </span>
                ))}
                {dayEvents.length > 3 && (
                  <span className="px-1 text-[10px] text-white/30">
                    +{dayEvents.length - 3}
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
