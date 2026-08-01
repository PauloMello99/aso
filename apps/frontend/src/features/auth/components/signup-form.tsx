"use client"

import * as React from "react"
import { Controller, useForm } from "react-hook-form"
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
import { Checkbox } from "@/shared/components/ui/checkbox"
import { BrandWordmark } from "@/shared/components/brand-wordmark"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { LEGAL_ROUTES, LEGAL_VERSIONS } from "@/features/legal"
import {
  signupSchema,
  type SignupFormValues,
} from "@/features/auth/schemas/auth.schemas"

function queryParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : ""
}

export function SignupForm() {
  const { signUp } = useAuth()
  const router = useRouter()
  const inviteToken = queryParam(router.query.invite)
  const invitedEmail = queryParam(router.query.email)

  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptedTerms: false,
    },
  })

  React.useEffect(() => {
    if (invitedEmail) {
      reset({
        name: "",
        email: invitedEmail,
        password: "",
        confirmPassword: "",
        acceptedTerms: false,
      })
    }
  }, [invitedEmail, reset])

  const onSubmit = async (data: SignupFormValues) => {
    try {
      await signUp(data.name, data.email, data.password, LEGAL_VERSIONS.terms)
      await router.push(
        inviteToken
          ? `/invite/accept?token=${encodeURIComponent(inviteToken)}`
          : "/dashboard/organizations",
      )
    } catch {
      setError("root", { message: "Não foi possível criar a conta. Tente novamente." })
    }
  }

  const loginHref = inviteToken
    ? `/auth/login?invite=${encodeURIComponent(inviteToken)}${invitedEmail ? `&email=${encodeURIComponent(invitedEmail)}` : ""}`
    : "/auth/login"

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6">
      <Card className="w-full max-w-sm border-foreground/5 bg-foreground/[0.03]">
        <CardHeader className="text-center">
          <div className="mb-2">
            <BrandWordmark className="text-xl font-bold" />
          </div>
          <CardTitle className="text-xl">Criar conta</CardTitle>
          <CardDescription className="text-foreground/40">
            Comece a gerenciar seu estúdio gratuitamente
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
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                type="text"
                placeholder="Seu nome"
                autoComplete="name"
                aria-invalid={!!errors.name}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

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
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 8 caracteres"
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

            <div className="flex items-start gap-2">
              <Controller
                control={control}
                name="acceptedTerms"
                render={({ field }) => (
                  <Checkbox
                    id="acceptedTerms"
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                    className="mt-0.5"
                  />
                )}
              />
              <Label htmlFor="acceptedTerms" className="text-sm font-normal leading-relaxed text-foreground/60">
                Li e concordo com os{" "}
                <Link
                  href={LEGAL_ROUTES.terms}
                  target="_blank"
                  className="text-primary hover:underline"
                >
                  Termos de Uso
                </Link>{" "}
                e a{" "}
                <Link
                  href={LEGAL_ROUTES.privacy}
                  target="_blank"
                  className="text-primary hover:underline"
                >
                  Política de Privacidade
                </Link>
                .
              </Label>
            </div>
            {errors.acceptedTerms && (
              <p className="text-xs text-destructive">
                {errors.acceptedTerms.message}
              </p>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar conta
            </Button>
            <p className="text-center text-sm text-foreground/40">
              Já tem conta?{" "}
              <Link
                href={loginHref}
                className="text-primary hover:text-primary/80"
              >
                Entrar
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
