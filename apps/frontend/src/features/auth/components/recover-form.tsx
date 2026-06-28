"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { Loader2, MailCheck } from "lucide-react"
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
  recoverSchema,
  type RecoverFormValues,
} from "@/features/auth/schemas/auth.schemas"

export function RecoverForm() {
  const { forgotPassword } = useAuth()
  const [sent, setSent] = React.useState(false)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RecoverFormValues>({
    resolver: zodResolver(recoverSchema),
    defaultValues: { email: "" },
  })

  const onSubmit = async (data: RecoverFormValues) => {
    try {
      await forgotPassword(data.email)
      setSent(true)
    } catch {
      setError("root", { message: "Não foi possível enviar o e-mail. Tente novamente." })
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm border-foreground/5 bg-foreground/[0.03]">
        <CardHeader className="text-center">
          <div className="mb-2 text-xl font-bold">
            ink<span className="text-orange-500">ops</span>
          </div>
          <CardTitle className="text-xl">Recuperar senha</CardTitle>
          <CardDescription className="text-foreground/40">
            Enviaremos um link para redefinir sua senha
          </CardDescription>
        </CardHeader>

        {sent ? (
          <CardContent className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/10">
              <MailCheck className="h-6 w-6 text-orange-400" />
            </div>
            <p className="text-sm text-foreground/50">
              Se esse e-mail estiver cadastrado, você receberá um link em breve.
              Verifique sua caixa de entrada e a pasta de spam.
            </p>
            <Button asChild variant="outline" className="w-full border-foreground/10">
              <Link href="/auth/login">Voltar ao login</Link>
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
            </CardContent>

            <CardFooter className="flex flex-col gap-3">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-orange-500 text-white hover:bg-orange-600"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar link
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
