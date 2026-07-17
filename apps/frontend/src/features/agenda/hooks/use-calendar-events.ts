"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import type { CalendarEvent, CalendarEventType } from "../types"

export interface CalendarEventBody {
  type: CalendarEventType
  status?: "scheduled" | "canceled"
  title: string
  description?: string | null
  customerId?: string | null
  /** users.id do membro dono do horário (só owner; funcionário força = self). */
  assignedTo?: string | null
  startsAt: string // ISO
  endsAt: string // ISO
  allDay?: boolean
  visibility?: "private" | "shared"
}

interface UseCalendarEventsArgs {
  orgId: string
  start: Date
  end: Date
  /** users.id — filtro de membro (owner/admin). */
  assignedTo?: string
}

export function useCalendarEvents({
  orgId,
  start,
  end,
  assignedTo,
}: UseCalendarEventsArgs) {
  const queryClient = useQueryClient()
  const startIso = start.toISOString()
  const endIso = end.toISOString()

  const calendarKey = ["calendar", orgId] as const

  const { data = [], isLoading, error, refetch } = useQuery({
    queryKey: ["calendar", orgId, startIso, endIso, assignedTo ?? "self"],
    queryFn: () => {
      const params = new URLSearchParams({ start: startIso, end: endIso })
      if (assignedTo) params.set("assignedTo", assignedTo)
      return apiRequest<CalendarEvent[]>(`/orgs/${orgId}/calendar?${params.toString()}`)
    },
    enabled: !!orgId,
  })

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: calendarKey })

  const createMutation = useMutation({
    mutationFn: (body: CalendarEventBody) =>
      apiRequest<CalendarEvent>(`/orgs/${orgId}/calendar`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<CalendarEventBody> }) =>
      apiRequest<CalendarEvent>(`/orgs/${orgId}/calendar/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<void>(`/orgs/${orgId}/calendar/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  })

  return {
    events: data,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
    createEvent: (body: CalendarEventBody) => createMutation.mutateAsync(body),
    updateEvent: (id: string, body: Partial<CalendarEventBody>) =>
      updateMutation.mutateAsync({ id, body }),
    deleteEvent: (id: string) => deleteMutation.mutateAsync(id),
  }
}
