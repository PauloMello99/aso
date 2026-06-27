"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { useAuth } from "@/features/auth/hooks/use-auth"
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from "@/features/auth/schemas/auth.schemas"
import { useSearchParams } from "next/navigation"

export function ResetPasswordForm() {
  const { resetPassword } = useAuth()
  const searchParams = useSearchParams()
  const [tokenError, setTokenError] = React.useState(false)
  const [success, setSuccess] = React.useState(false)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  })

  const access_token = searchParams.get("access_token") || searchParams.get("token")
  const refresh_token = searchParams.get("refresh_token") || undefined
  const type = searchParams.get("type")

  React.useEffect(() => {
    console.log("Parsed > ", JSON.stringify({ access_token, refresh_token, type },null, 2))
  
    if (!access_token || type !== "recovery") setTokenError(true)
    else setTokenError(false)
  }, [access_token, refresh_token, searchParams, type])

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!access_token) {
      setError("root", {
        message: "Não foi possível redefinir a senha. Falha ao encontrar token de acesso.",
      })
      return
    }

    try {
      await resetPassword(access_token, data.password, refresh_token)
      setSuccess(true)
    } catch {
      setError("root", {
        message: "Não foi possível redefinir a senha. O link pode ter expirado.",
      })
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm border-foreground/5 bg-foreground/[0.03]">
        <CardHeader className="text-center">
          <div className="mb-2 text-xl font-bold">
            ink<span className="text-orange-500">ops</span>
          </div>
          <CardTitle className="text-xl">Nova senha</CardTitle>
          <CardDescription className="text-foreground/40">
            Defina uma nova senha para sua conta
          </CardDescription>
        </CardHeader>

        {tokenError ? (
          <CardContent className="space-y-4 text-center">
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Link inválido ou expirado. Solicite um novo link de recuperação.
            </p>
            <Button asChild variant="outline" className="w-full border-foreground/10">
              <Link href="/auth/recover">Solicitar novo link</Link>
            </Button>
          </CardContent>
        ) : success ? (
          <CardContent className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/10">
              <CheckCircle2 className="h-6 w-6 text-orange-400" />
            </div>
            <p className="text-sm text-foreground/50">
              Sua senha foi redefinida com sucesso. Você já pode fazer login com a nova senha.
            </p>
            <Button asChild className="w-full bg-orange-500 text-white hover:bg-orange-600">
              <Link href="/auth/login">Ir para o login</Link>
            </Button>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              {errors.root && (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {errors.root.message}
                </p>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="password">Nova senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  aria-invalid={!!errors.password}
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  aria-invalid={!!errors.confirmPassword}
                  {...register("confirmPassword")}
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3">
              <Button
                type="submit"
                disabled={isSubmitting || !access_token}
                className="w-full bg-orange-500 text-white hover:bg-orange-600"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Redefinir senha
              </Button>
              <p className="text-center text-sm text-foreground/40">
                <Link href="/auth/login" className="hover:text-foreground">
                  ← Voltar ao login
                </Link>
              </p>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  )
}
