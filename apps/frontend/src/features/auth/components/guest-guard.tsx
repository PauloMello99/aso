"use client"

import * as React from "react"
import { useRouter } from "next/router"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/features/auth/hooks/use-auth"

interface GuestGuardProps {
  children: React.ReactNode
}

function queryParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : ""
}

export function GuestGuard({ children }: GuestGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  React.useEffect(() => {
    if (loading || !user) return
    const inviteToken = queryParam(router.query.invite)
    void router.replace(
      inviteToken
        ? `/invite/accept?token=${encodeURIComponent(inviteToken)}`
        : "/dashboard/organizations",
    )
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-foreground/30" />
      </div>
    )
  }

  if (user) return null

  return <>{children}</>
}
