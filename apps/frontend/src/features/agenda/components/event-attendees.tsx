"use client"

import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"
import { useEventAttendees } from "../hooks/use-event-attendees"
import type { AttendeeStatus } from "../types"

interface EventAttendeesProps {
  orgId: string
  eventId: string
  currentUserId?: string
}

const STATUS_LABEL: Record<AttendeeStatus, string> = {
  going: "Vai",
  not_going: "Não vai",
  pending: "Pendente",
}

const STATUS_CLASS: Record<AttendeeStatus, string> = {
  going: "bg-green-500/15 text-green-300",
  not_going: "bg-red-500/15 text-red-300",
  pending: "bg-foreground/[0.08] text-foreground/50",
}

export function EventAttendees({
  orgId,
  eventId,
  currentUserId,
}: EventAttendeesProps) {
  const { attendees, loading, error, setRsvp, rsvpPending } = useEventAttendees({
    orgId,
    eventId,
    enabled: true,
  })

  const myStatus = attendees.find((a) => a.userId === currentUserId)?.status

  async function handleRsvp(status: AttendeeStatus) {
    try {
      await setRsvp(status)
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível registrar sua presença.")
    }
  }

  return (
    <div className="mt-4 space-y-3 border-t border-foreground/[0.06] pt-4">
      <h3 className="text-sm font-medium text-foreground">Presença da equipe</h3>

      {error ? (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      ) : loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-9 animate-pulse rounded-lg border border-foreground/[0.06] bg-foreground/[0.02]"
            />
          ))}
        </div>
      ) : attendees.length === 0 ? (
        <p className="text-sm text-foreground/40">Nenhum membro ativo na organização.</p>
      ) : (
        <ul className="space-y-2">
          {attendees.map((a) => (
            <li
              key={a.userId}
              className="flex items-center justify-between gap-3 rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] px-3 py-2"
            >
              <span className="truncate text-sm text-foreground">
                {a.name}
                {a.userId === currentUserId && (
                  <span className="text-foreground/40"> (você)</span>
                )}
              </span>
              <Badge className={cn(STATUS_CLASS[a.status])}>
                {STATUS_LABEL[a.status]}
              </Badge>
            </li>
          ))}
        </ul>
      )}

      {currentUserId && (
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={myStatus === "going" ? "default" : "outline"}
            disabled={rsvpPending}
            className="flex-1 sm:flex-none"
            onClick={() => void handleRsvp("going")}
          >
            Vou
          </Button>
          <Button
            type="button"
            size="sm"
            variant={myStatus === "not_going" ? "default" : "outline"}
            disabled={rsvpPending}
            className="flex-1 sm:flex-none"
            onClick={() => void handleRsvp("not_going")}
          >
            Não vou
          </Button>
        </div>
      )}
    </div>
  )
}
