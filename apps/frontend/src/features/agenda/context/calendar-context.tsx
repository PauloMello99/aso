"use client"

import * as React from "react"
import {
  addDays,
  addMonths,
  addWeeks,
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns"
import type { CalendarView } from "../types"

const WEEK_OPTS = { weekStartsOn: 1 } as const // segunda-feira

interface Range {
  start: Date
  end: Date
}

function rangeFor(date: Date, view: CalendarView): Range {
  switch (view) {
    case "day":
      return { start: startOfDay(date), end: endOfDay(date) }
    case "week":
      return {
        start: startOfWeek(date, WEEK_OPTS),
        end: endOfWeek(date, WEEK_OPTS),
      }
    case "month":
      return {
        start: startOfWeek(startOfMonth(date), WEEK_OPTS),
        end: endOfWeek(endOfMonth(date), WEEK_OPTS),
      }
  }
}

interface CalendarContextValue {
  view: CalendarView
  setView: (v: CalendarView) => void
  current: Date
  range: Range
  goNext: () => void
  goPrev: () => void
  goToday: () => void
  setCurrent: (d: Date) => void
}

const CalendarContext = React.createContext<CalendarContextValue | null>(null)

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const [view, setView] = React.useState<CalendarView>("week")
  const [current, setCurrent] = React.useState<Date>(() => new Date())

  const range = React.useMemo(() => rangeFor(current, view), [current, view])

  const goNext = React.useCallback(() => {
    setCurrent((d) =>
      view === "day" ? addDays(d, 1) : view === "week" ? addWeeks(d, 1) : addMonths(d, 1),
    )
  }, [view])

  const goPrev = React.useCallback(() => {
    setCurrent((d) =>
      view === "day" ? subDays(d, 1) : view === "week" ? subWeeks(d, 1) : subMonths(d, 1),
    )
  }, [view])

  const goToday = React.useCallback(() => setCurrent(new Date()), [])

  const value = React.useMemo(
    () => ({ view, setView, current, range, goNext, goPrev, goToday, setCurrent }),
    [view, current, range, goNext, goPrev, goToday],
  )

  return <CalendarContext.Provider value={value}>{children}</CalendarContext.Provider>
}

export function useCalendar(): CalendarContextValue {
  const ctx = React.useContext(CalendarContext)
  if (!ctx) throw new Error("useCalendar must be used within CalendarProvider")
  return ctx
}
