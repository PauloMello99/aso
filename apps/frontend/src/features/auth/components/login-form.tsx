"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/router"
import Link from "next/link"
import { Loader2 } from "lucide-react"
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
import { BrandWordmark } from "@/shared/components/brand-wordmark"
import { useAuth } from "@/features/auth/hooks/use-auth"
import {
  loginSchema,
  type LoginFormValues,
} from "@/features/auth/schemas/auth.schemas"

function queryParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : ""
}

export function LoginForm() {
  const { signIn } = useAuth()
  const router = useRouter()
  const inviteToken = queryParam(router.query.invite)
  const invitedEmail = queryParam(router.query.email)

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  React.useEffect(() => {
    if (invitedEmail) reset({ email: invitedEmail, password: "" })
  }, [invitedEmail, reset])

  const onSubmit = async (data: LoginFormValues) => {
    try {
      await signIn(data.email, data.password)
      await router.push(
        inviteToken
          ? `/invite/accept?token=${encodeURIComponent(inviteToken)}`
          : "/dashboard/organizations",
      )
    } catch {
      setError("root", { message: "E-mail ou senha inválidos" })
    }
  }

  const signupHref = inviteToken
    ? `/auth/signup?invite=${encodeURIComponent(inviteToken)}${invitedEmail ? `&email=${encodeURIComponent(invitedEmail)}` : ""}`
    : "/auth/signup"

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm border-foreground/5 bg-foreground/[0.03]">
        <CardHeader className="text-center">
          <div className="mb-2">
            <BrandWordmark className="text-xl font-bold" />
          </div>
          <CardTitle className="text-xl">Entrar</CardTitle>
          <CardDescription className="text-foreground/40">
            Acesse sua conta para continuar
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {errors.root && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errors.root.message}
              </p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                autoComplete="email"
                aria-invalid={!!errors.email}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <Link
                  href="/auth/recover"
                  className="text-xs text-foreground/40 hover:text-foreground"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Entrar
            </Button>
            <p className="text-center text-sm text-foreground/40">
              Não tem conta?{" "}
              <Link
                href={signupHref}
                className="text-primary hover:text-primary/80"
              >
                Criar conta
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
