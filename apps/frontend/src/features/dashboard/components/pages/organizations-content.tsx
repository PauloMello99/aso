import * as React from "react"
import Link from "next/link"
import { PlusCircle, Building2, ChevronRight } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { useOrgs } from "@/features/dashboard/hooks/use-orgs"
import { CreateOrgForm, useOrgMutations } from "@/features/organizations"
import type { CreateOrgFormValues } from "@/features/organizations"

const ROLE_LABELS: Record<string, string> = {
  owner: "Dono",
  employee: "Funcionário",
}

export function OrganizationsContent() {
  const [createOpen, setCreateOpen] = React.useState(false)
  const { orgs } = useOrgs()
  const { createOrg } = useOrgMutations()

  async function handleCreate(values: CreateOrgFormValues) {
    await createOrg(values)
    // invalidateQueries in useOrgMutations.onSuccess triggers automatic refetch
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">
            Organizações
          </h1>
          <p className="mt-1 text-sm text-foreground/40">
            Selecione uma organização para continuar
          </p>
        </div>
        <Button
          className="w-full bg-orange-500 text-white hover:bg-orange-600 sm:w-auto"
          size="sm"
          onClick={() => setCreateOpen(true)}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Nova organização
        </Button>
      </div>

      {/* Org list */}
      {orgs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-foreground/10 py-16 text-center sm:py-20">
          <Building2 className="mb-4 h-10 w-10 text-foreground/20" />
          <p className="text-sm text-foreground/40">Nenhuma organização ainda.</p>
          <Button
            className="mt-4 w-full bg-orange-500 text-white hover:bg-orange-600 sm:w-auto"
            size="sm"
            onClick={() => setCreateOpen(true)}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Criar organização
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {orgs.map((org) => (
            <li key={org.id}>
              <Link
                href={`/dashboard/org/${org.slug}/overview`}
                className="group flex items-center justify-between rounded-xl border border-foreground/5 bg-foreground/[0.02] px-4 py-3.5 transition-all hover:border-foreground/10 hover:bg-foreground/[0.05] sm:px-5 sm:py-4"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-sm font-bold text-orange-400 sm:h-10 sm:w-10 sm:text-base">
                    {org.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{org.name}</p>
                    <p className="truncate text-sm text-foreground/40">/{org.slug}</p>
                  </div>
                </div>
                <div className="ml-3 flex shrink-0 items-center gap-2 sm:gap-3">
                  <Badge
                    variant="outline"
                    className="hidden border-foreground/10 text-foreground/50 sm:inline-flex"
                  >
                    {ROLE_LABELS[org.role]}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-foreground/20 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground/40" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <CreateOrgForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
      />
    </div>
  )
}
