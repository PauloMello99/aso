"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { TicketList } from "./ticket-list"
import { TicketFormDialog } from "./ticket-form-dialog"

interface TicketsPageProps {
  orgId: string
  orgSlug: string
}

export function TicketsPage({ orgId, orgSlug }: TicketsPageProps) {
  const [formOpen, setFormOpen] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Suporte</h1>
          <p className="mt-0.5 text-sm text-foreground/40">
            Abra e acompanhe chamados com o time de suporte.
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="sm:flex-none">
          <Plus className="h-4 w-4" />
          Abrir chamado
        </Button>
      </div>

      <TicketList orgId={orgId} orgSlug={orgSlug} />

      <TicketFormDialog open={formOpen} onOpenChange={setFormOpen} orgId={orgId} />
    </div>
  )
}
