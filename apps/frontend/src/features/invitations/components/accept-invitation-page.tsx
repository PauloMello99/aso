"use client"

import * as React from "react"
import { useRouter } from "next/router"
import { Loader2 } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { BrandWordmark } from "@/shared/components/brand-wordmark"
import { useAuth } from "@/features/auth/hooks/use-auth"
import {
  useInvitationLookup,
  useAcceptInvitation,
  useDeclineInvitation,
} from "../hooks/use-invitation"
import type { OrgRole } from "@/features/organizations/types"

const ROLE_LABELS: Record<OrgRole, string> = {
  owner: "Proprietário",
  employee: "Funcionário",
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6">
      <Card className="w-full max-w-sm border-foreground/5 bg-foreground/[0.03]">{children}</Card>
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-foreground/30" />
    </div>
  )
}

export function AcceptInvitationPage() {
  const router = useRouter()
  const token =
    typeof router.query.token === "string" ? router.query.token : undefined

  const { user, loading: authLoading, signOut } = useAuth()
  const { data: invite, isLoading, error } = useInvitationLookup(token)
  const { acceptInvitation, accepting } = useAcceptInvitation()
  const { declineInvitation, declining } = useDeclineInvitation()
  const [acceptError, setAcceptError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!router.isReady || authLoading || isLoading) return
    if (!invite || invite.status !== "pending" || invite.expired) return
    if (!user && token) {
      const dest = invite.hasAccount ? "/auth/login" : "/auth/signup"
      const qs = `invite=${encodeURIComponent(token)}&email=${encodeURIComponent(invite.email)}`
      void router.replace(`${dest}?${qs}`)
    }
  }, [router, authLoading, isLoading, invite, user, token])

  if (!router.isReady || authLoading || isLoading) return <Spinner />

  if (!token || error || !invite) {
    return (
      <Centered>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Convite inválido</CardTitle>
          <CardDescription className="text-foreground/40">
            Este link de convite não é válido.
          </CardDescription>
        </CardHeader>
      </Centered>
    )
  }

  if (invite.status !== "pending" || invite.expired) {
    const reason =
      invite.status === "accepted"
        ? "Este convite já foi aceito."
        : invite.status === "cancelled"
          ? "Este convite foi cancelado."
          : "Este convite expirou."
    return (
      <Centered>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Convite indisponível</CardTitle>
          <CardDescription className="text-foreground/40">{reason}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => void router.replace("/dashboard/organizations")}
          >
            Ir para o painel
          </Button>
        </CardFooter>
      </Centered>
    )
  }

  if (!user) return <Spinner />

  const inviteEmail = invite.email
  const emailMismatch = user.email.toLowerCase() !== inviteEmail.toLowerCase()

  async function handleSwitchAccount() {
    await signOut()
    if (token) {
      const qs = `invite=${encodeURIComponent(token)}&email=${encodeURIComponent(inviteEmail)}`
      void router.replace(`/auth/login?${qs}`)
    }
  }

  async function handleAccept() {
    if (!token) return
    setAcceptError(null)
    try {
      const res = await acceptInvitation(token)
      void router.replace(`/dashboard/org/${res.orgSlug}`)
    } catch (err) {
      setAcceptError(
        err instanceof Error ? err.message : "Não foi possível aceitar o convite.",
      )
    }
  }

  async function handleDecline() {
    if (!token) return
    setAcceptError(null)
    try {
      await declineInvitation(token)
      void router.replace("/dashboard/organizations")
    } catch (err) {
      setAcceptError(
        err instanceof Error ? err.message : "Não foi possível recusar o convite.",
      )
    }
  }

  return (
    <Centered>
      <CardHeader className="text-center">
        <div className="mb-2">
          <BrandWordmark className="text-xl font-bold" />
        </div>
        <CardTitle className="text-xl">Convite para {invite.orgName}</CardTitle>
        <CardDescription className="text-foreground/40">
          Você foi convidado como{" "}
          <span className="text-foreground/70">{ROLE_LABELS[invite.role]}</span>.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {acceptError && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {acceptError}
          </p>
        )}
        {emailMismatch ? (
          <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
            Este convite é para <strong>{invite.email}</strong>, mas você está
            logado como <strong>{user.email}</strong>. Entre com a conta correta
            para aceitar.
          </div>
        ) : (
          <p className="text-center text-sm text-foreground/50">
            Aceitando como <span className="text-foreground/80">{user.email}</span>.
          </p>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-2">
        {emailMismatch ? (
          <Button
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => void handleSwitchAccount()}
          >
            Trocar de conta
          </Button>
        ) : (
          <>
            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={accepting || declining}
              onClick={() => void handleAccept()}
            >
              {accepting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Aceitar convite
            </Button>
            <Button
              variant="ghost"
              className="w-full text-foreground/50 hover:text-foreground"
              disabled={accepting || declining}
              onClick={() => void handleDecline()}
            >
              {declining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Recusar
            </Button>
          </>
        )}
      </CardFooter>
    </Centered>
  )
}
