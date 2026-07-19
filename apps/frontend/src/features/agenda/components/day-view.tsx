"use client"

import * as React from "react"
import { format, isSameDay, parseISO } from "date-fns"
import { cn } from "@/shared/lib/utils"
import type { CalendarEvent } from "../types"

const START_HOUR = 0
const END_HOUR = 24
const HOUR_PX = 56
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

function minutesFromStart(d: Date): number {
  return (d.getHours() - START_HOUR) * 60 + d.getMinutes()
}

interface DayViewProps {
  current: Date
  events: CalendarEvent[]
  onSlotClick: (date: string, startTime: string, endTime: string) => void
  onEventClick: (event: CalendarEvent) => void
}

export function DayView({
  current,
  events,
  onSlotClick,
  onEventClick,
}: DayViewProps) {
  const dayEvents = events.filter((ev) => isSameDay(parseISO(ev.startsAt), current))

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const totalMin = Math.floor(((e.clientY - rect.top) / HOUR_PX) * 60)
    const snapped = Math.floor(totalMin / 30) * 30
    const startMin = START_HOUR * 60 + snapped
    const sh = String(Math.floor(startMin / 60)).padStart(2, "0")
    const sm = String(startMin % 60).padStart(2, "0")
    const endMin = startMin + 60
    const eh = String(Math.floor(endMin / 60)).padStart(2, "0")
    const em = String(endMin % 60).padStart(2, "0")
    onSlotClick(format(current, "yyyy-MM-dd"), `${sh}:${sm}`, `${eh}:${em}`)
  }

  const allDayEvents = dayEvents.filter((ev) => ev.allDay)
  const timedEvents = dayEvents.filter((ev) => !ev.allDay)
  const gridH = HOURS.length * HOUR_PX

  return (
    <div className="rounded-xl border border-foreground/[0.06]">
      <div className="grid grid-cols-[64px_1fr] border-b border-foreground/[0.06]">
        <div className="flex items-center justify-end pr-2 text-[10px] uppercase text-foreground/30">
          Dia todo
        </div>
        <div className="min-h-[30px] space-y-1 border-l border-foreground/[0.06] p-1">
          {allDayEvents.map((ev) => (
            <button
              key={ev.id}
              type="button"
              onClick={() => onEventClick(ev)}
              className={cn(
                "block w-full truncate rounded px-2 py-0.5 text-left text-xs transition-colors",
                ev.type === "unavailability"
                  ? "bg-foreground/[0.06] text-foreground/50 [background-image:repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(255,255,255,0.04)_6px,rgba(255,255,255,0.04)_12px)]"
                  : "bg-primary/15 text-primary hover:bg-primary/25",
                ev.status === "canceled" && "line-through opacity-40",
              )}
            >
              {ev.title}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-[64px_1fr]">
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
        <div
          className="relative border-l border-foreground/[0.06]"
          style={{ height: gridH }}
          onClick={handleClick}
        >
          {HOURS.map((h) => (
            <div
              key={h}
              style={{ height: HOUR_PX }}
              className="border-b border-foreground/[0.04]"
            />
          ))}
          {timedEvents.map((ev) => {
            const s = parseISO(ev.startsAt)
            const e = parseISO(ev.endsAt)
            const top = Math.max(0, (minutesFromStart(s) / 60) * HOUR_PX)
            const bottom = Math.min(gridH, (minutesFromStart(e) / 60) * HOUR_PX)
            const height = Math.max(20, bottom - top)
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
                  "absolute left-2 right-2 overflow-hidden rounded-md border px-2 py-1 text-left text-xs transition-colors",
                  isBusy
                    ? "border-foreground/10 bg-foreground/[0.06] text-foreground/50 [background-image:repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(255,255,255,0.04)_6px,rgba(255,255,255,0.04)_12px)]"
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
      </div>
    </div>
  )
}
