"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import type { Attendee, AttendeeStatus } from "../types"

interface UseEventAttendeesArgs {
  orgId: string
  eventId: string | undefined
  enabled?: boolean
}

export function useEventAttendees({
  orgId,
  eventId,
  enabled = true,
}: UseEventAttendeesArgs) {
  const queryClient = useQueryClient()
  const attendeesKey = ["calendar", orgId, "attendees", eventId] as const

  const { data = [], isLoading, error } = useQuery({
    queryKey: attendeesKey,
    queryFn: () =>
      apiRequest<Attendee[]>(`/orgs/${orgId}/calendar/${eventId}/attendees`),
    enabled: !!eventId && enabled,
  })

  const rsvpMutation = useMutation({
    mutationFn: (status: AttendeeStatus) =>
      apiRequest<void>(`/orgs/${orgId}/calendar/${eventId}/rsvp`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: attendeesKey }),
  })

  return {
    attendees: data,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    setRsvp: (status: AttendeeStatus) => rsvpMutation.mutateAsync(status),
    rsvpPending: rsvpMutation.isPending,
  }
}
