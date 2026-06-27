"use client"

import * as React from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { useCurrentOrg } from "@/features/dashboard"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useMembers } from "@/features/organizations/hooks/use-members"
import { CalendarProvider, useCalendar } from "../context/calendar-context"
import { useCalendarEvents, type CalendarEventBody } from "../hooks/use-calendar-events"
import { CalendarHeader } from "./calendar-header"
import { WeekView } from "./week-view"
import { MonthView } from "./month-view"
import { DayView } from "./day-view"
import { EventForm } from "./event-form"
import type { CalendarEvent } from "../types"

const ALL_MEMBERS = "all"

function AgendaInner() {
  const { org, orgId } = useCurrentOrg()
  const { user } = useAuth()
  const isOwner = org.role === "owner"
  const { members } = useMembers(orgId)
  const myUserId = members.find((m) => m.userEmail === user?.email)?.userId

  const { view, current, range, setView, setCurrent } = useCalendar()

  // Admin (owner) pode filtrar por membro; employee vê só os seus.
  const [filterUserId, setFilterUserId] = React.useState<string | undefined>(undefined)

  const { events, loading, error, refetch, createEvent, updateEvent, deleteEvent } =
    useCalendarEvents({
      orgId,
      start: range.start,
      end: range.end,
      assignedTo: isOwner ? filterUserId : undefined,
    })

  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<CalendarEvent | null>(null)
  const [readOnly, setReadOnly] = React.useState(false)
  const [ownerName, setOwnerName] = React.useState<string | null>(null)
  const [slot, setSlot] = React.useState<
    { date: string; startTime: string; endTime: string } | null
  >(null)

  function openNew() {
    setEditing(null)
    setSlot(null)
    setReadOnly(false)
    setOwnerName(null)
    setFormOpen(true)
  }

  function openSlot(date: string, startTime: string, endTime: string) {
    setEditing(null)
    setSlot({ date, startTime, endTime })
    setReadOnly(false)
    setOwnerName(null)
    setFormOpen(true)
  }

  function openEvent(ev: CalendarEvent) {
    // Mesmo admin não edita evento de outro membro: abre em modo leitura.
    const ro = !!myUserId && ev.assignedTo !== myUserId
    setReadOnly(ro)
    setOwnerName(
      ro ? (members.find((m) => m.userId === ev.assignedTo)?.userName ?? null) : null,
    )
    setEditing(ev)
    setSlot(null)
    setFormOpen(true)
  }

  async function handleSubmit(body: CalendarEventBody, id?: string) {
    try {
      if (id) await updateEvent(id, body)
      else await createEvent(body)
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível salvar o evento.")
      throw e // mantém o formulário aberto
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteEvent(id)
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível excluir o evento.")
      throw e
    }
  }

  async function handleSetStatus(id: string, status: "scheduled" | "canceled") {
    try {
      await updateEvent(id, { status })
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível alterar o status.")
      throw e
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Agenda</h1>
          <p className="mt-0.5 text-sm text-foreground/40">
            Seus atendimentos e bloqueios de horário em {org.name}.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void refetch()}
          disabled={loading}
          title="Atualizar"
        >
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        </Button>
      </div>

      <CalendarHeader
        onNew={openNew}
        filterSlot={
          isOwner ? (
            <Select
              value={filterUserId ?? ALL_MEMBERS}
              onValueChange={(v) =>
                setFilterUserId(v === ALL_MEMBERS ? undefined : v)
              }
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Membro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_MEMBERS}>Todos os membros</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.userId} value={m.userId}>
                    {m.userName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null
        }
      />

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {view === "week" && (
        <WeekView
          current={current}
          events={events}
          onSlotClick={openSlot}
          onEventClick={openEvent}
        />
      )}
      {view === "day" && (
        <DayView
          current={current}
          events={events}
          onSlotClick={openSlot}
          onEventClick={openEvent}
        />
      )}
      {view === "month" && (
        <MonthView
          current={current}
          events={events}
          onDayClick={(date) => {
            setCurrent(new Date(`${date}T12:00:00`))
            setView("day")
          }}
          onEventClick={openEvent}
        />
      )}

      <EventForm
        open={formOpen}
        onOpenChange={setFormOpen}
        orgId={orgId}
        event={editing}
        defaultSlot={slot}
        readOnly={readOnly}
        ownerName={ownerName}
        isOwner={isOwner}
        members={members}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        onSetStatus={handleSetStatus}
      />
    </div>
  )
}

export function AgendaPage() {
  return (
    <CalendarProvider>
      <AgendaInner />
    </CalendarProvider>
  )
}
