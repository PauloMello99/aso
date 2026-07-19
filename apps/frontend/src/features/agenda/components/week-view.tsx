"use client"

import * as React from "react"
import {
  addDays,
  format,
  isSameDay,
  parseISO,
  startOfWeek,
} from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/shared/lib/utils"
import type { CalendarEvent } from "../types"

const START_HOUR = 0
const END_HOUR = 24
const HOUR_PX = 48
const WEEK_OPTS = { weekStartsOn: 1 } as const

const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

function minutesFromStart(d: Date): number {
  return (d.getHours() - START_HOUR) * 60 + d.getMinutes()
}

interface WeekViewProps {
  current: Date
  events: CalendarEvent[]
  onSlotClick: (date: string, startTime: string, endTime: string) => void
  onEventClick: (event: CalendarEvent) => void
}

export function WeekView({
  current,
  events,
  onSlotClick,
  onEventClick,
}: WeekViewProps) {
  const weekStart = startOfWeek(current, WEEK_OPTS)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const today = new Date()

  const handleColumnClick = (day: Date, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const offsetY = e.clientY - rect.top
    const totalMin = Math.floor(offsetY / HOUR_PX * 60)
    const snapped = Math.floor(totalMin / 30) * 30
    const startMin = START_HOUR * 60 + snapped
    const sh = String(Math.floor(startMin / 60)).padStart(2, "0")
    const sm = String(startMin % 60).padStart(2, "0")
    const endMin = startMin + 60
    const eh = String(Math.floor(endMin / 60)).padStart(2, "0")
    const em = String(endMin % 60).padStart(2, "0")
    onSlotClick(format(day, "yyyy-MM-dd"), `${sh}:${sm}`, `${eh}:${em}`)
  }

  return (
    <div className="overflow-x-auto overflow-y-hidden rounded-xl border border-foreground/[0.06]">
      <div className="min-w-[680px]">
        <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-foreground/[0.06]">
          <div />
          {days.map((d) => {
            const isToday = isSameDay(d, today)
            return (
              <div
                key={d.toISOString()}
                className="border-l border-foreground/[0.06] py-2 text-center"
              >
                <div className="text-[11px] uppercase text-foreground/40">
                  {format(d, "EEE", { locale: ptBR })}
                </div>
                <div
                  className={cn(
                    "mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm",
                    isToday ? "bg-primary font-semibold text-primary-foreground" : "text-foreground/80",
                  )}
                >
                  {format(d, "d")}
                </div>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-foreground/[0.06]">
          <div className="flex items-center justify-end pr-2 text-[10px] uppercase text-foreground/30">
            Dia todo
          </div>
          {days.map((day) => {
            const allDay = events.filter(
              (ev) => ev.allDay && isSameDay(parseISO(ev.startsAt), day),
            )
            return (
              <div
                key={day.toISOString()}
                className="min-h-[30px] space-y-1 border-l border-foreground/[0.06] p-1"
              >
                {allDay.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => onEventClick(ev)}
                    className={cn(
                      "block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] leading-tight transition-colors",
                      ev.type === "unavailability"
                        ? "bg-foreground/[0.06] text-foreground/50 [background-image:repeating-linear-gradient(45deg,transparent,transparent_5px,rgba(255,255,255,0.04)_5px,rgba(255,255,255,0.04)_10px)]"
                        : "bg-primary/15 text-primary hover:bg-primary/25",
                      ev.status === "canceled" && "line-through opacity-40",
                    )}
                  >
                    {ev.title}
                  </button>
                ))}
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-[56px_repeat(7,1fr)]">
          <div>
            {HOURS.map((h) => (
              <div
                key={h}
                style={{ height: HOUR_PX }}
                className="relative -top-2 pr-2 text-right text-[11px] text-foreground/30"
              >
                {String(h).padStart(2, "0")}h
              </div>
            ))}
          </div>

          {days.map((day) => {
            const dayEvents = events.filter(
              (ev) => !ev.allDay && isSameDay(parseISO(ev.startsAt), day),
            )
            const gridH = HOURS.length * HOUR_PX
            return (
              <div
                key={day.toISOString()}
                className="relative border-l border-foreground/[0.06]"
                style={{ height: HOURS.length * HOUR_PX }}
                onClick={(e) => handleColumnClick(day, e)}
              >
                {HOURS.map((h) => (
                  <div
                    key={h}
                    style={{ height: HOUR_PX }}
                    className="border-b border-foreground/[0.04]"
                  />
                ))}
                {dayEvents.map((ev) => {
                  const s = parseISO(ev.startsAt)
                  const e = parseISO(ev.endsAt)
                  const top = Math.max(0, (minutesFromStart(s) / 60) * HOUR_PX)
                  const bottom = Math.min(gridH, (minutesFromStart(e) / 60) * HOUR_PX)
                  const height = Math.max(16, bottom - top)
                  const isBusy = ev.type === "unavailability"
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={(evt) => {
                        evt.stopPropagation()
                        onEventClick(ev)
                      }}
                      style={{ top, height }}
                      className={cn(
                        "absolute left-1 right-1 overflow-hidden rounded-md border px-1.5 py-0.5 text-left text-[11px] leading-tight transition-colors",
                        isBusy
                          ? "border-foreground/10 bg-foreground/[0.06] text-foreground/50 [background-image:repeating-linear-gradient(45deg,transparent,transparent_5px,rgba(255,255,255,0.04)_5px,rgba(255,255,255,0.04)_10px)]"
                          : "border-primary/30 bg-primary/15 text-primary hover:bg-primary/25",
                        ev.status === "canceled" && "line-through opacity-40",
                      )}
                    >
                      <span className="block truncate font-medium">{ev.title}</span>
                      {!ev.allDay && (
                        <span className="block truncate opacity-70">
                          {format(s, "HH:mm")}–{format(e, "HH:mm")}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
