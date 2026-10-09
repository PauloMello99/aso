"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/router"
import { Button } from "@/shared/components/ui/button"
import { QuoteRequestList } from "./quote-request-list"
import { QuoteRequestSheet } from "./quote-request-sheet"

interface QuoteInboxPageProps {
  orgId: string
  orgSlug: string
  role: "owner" | "employee"
}

// Evita um 400 do ParseUUIDPipe quando o ?id= da URL é lixo.
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function QuoteInboxPage({ orgId, orgSlug, role }: QuoteInboxPageProps) {
  const router = useRouter()
  const isOwner = role === "owner"
  const settingsHref = `/dashboard/org/${orgSlug}/settings/quote-form`

  const rawId = router.isReady ? router.query.id : undefined
  const selectedId =
    typeof rawId === "string" && UUID_PATTERN.test(rawId) ? rawId : null

  const updateIdParam = React.useCallback(
    (id: string | null) => {
      const nextQuery = { ...router.query }
      delete nextQuery.id
      if (id) nextQuery.id = id
      void router.replace(
        { pathname: router.pathname, query: nextQuery },
        undefined,
        { shallow: true },
      )
    },
    [router],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Orçamentos</h1>
          <p className="mt-0.5 text-sm text-foreground/40">
            Pedidos recebidos pelo formulário público do seu estúdio.
          </p>
          <Link
            href={settingsHref}
            className="mt-2 inline-flex min-h-[44px] items-center text-sm text-primary underline-offset-4 hover:underline sm:hidden"
          >
            Configurar formulário
          </Link>
        </div>
        <Button asChild variant="outline" className="hidden sm:inline-flex">
          <Link href={settingsHref}>Configurar formulário</Link>
        </Button>
      </div>

      <QuoteRequestList
        orgId={orgId}
        orgSlug={orgSlug}
        isOwner={isOwner}
        selectedId={selectedId}
        onSelect={updateIdParam}
      />

      <QuoteRequestSheet
        orgId={orgId}
        id={selectedId}
        isOwner={isOwner}
        onClose={() => updateIdParam(null)}
      />
    </div>
  )
}
