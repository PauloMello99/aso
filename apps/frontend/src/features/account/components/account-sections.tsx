"use client"

import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  KeyRound,
  Loader2,
  MailCheck,
  Palette,
  ShieldCheck,
  Upload,
} from "lucide-react"
import { useMe } from "@/features/auth"
import { useAuth } from "@/features/auth"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"

function SectionHeader({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-0.5 text-sm text-white/50">{description}</p>
    </div>
  )
}

/* ── Perfil ─────────────────────────────────────────────────────── */

const profileSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(120),
  email: z.string().email("E-mail inválido"),
})
type ProfileFormValues = z.infer<typeof profileSchema>
const MAX_AVATAR_BYTES = 5 * 1024 * 1024

export function ProfileSection() {
  const { me, loading, updateMe, uploadAvatar } = useMe()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const initialized = useRef(false)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", email: "" },
  })

  useEffect(() => {
    if (me && !initialized.current) {
      initialized.current = true
      form.reset({ name: me.name, email: me.email })
    }
  }, [me, form])

  const handleSubmit = form.handleSubmit(async (values) => {
    setError(null)
    setSaved(false)
    try {
      await updateMe({ name: values.name, email: values.email })
      setSaved(true)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível salvar o perfil.",
      )
    }
  })

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setAvatarError(null)
    if (!file.type.startsWith("image/")) {
      setAvatarError("Selecione um arquivo de imagem.")
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError("A imagem deve ter no máximo 5 MB.")
      return
    }
    setAvatarUploading(true)
    try {
      await uploadAvatar(file)
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Falha ao enviar a foto.")
    } finally {
      setAvatarUploading(false)
    }
  }

  return (
    <div className="grid gap-6">
      <SectionHeader
        title="Perfil"
        description="Gerencie seu nome, e-mail e foto de perfil."
      />
      {loading ? (
        <div className="flex items-center justify-center py-12 text-white/40">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Carregando…
        </div>
      ) : (
        <div className="grid max-w-lg gap-6">
          <div className="flex items-center gap-4">
            {me?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={me.avatarUrl}
                alt="Foto de perfil"
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/20 text-xl font-semibold text-orange-400">
                {(me?.name ?? "?").charAt(0).toUpperCase()}
              </span>
            )}
            <div className="grid gap-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={avatarUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {avatarUploading ? "Enviando…" : "Enviar foto"}
              </Button>
              {avatarError ? (
                <span className="text-xs text-red-400">{avatarError}</span>
              ) : (
                <span className="text-xs text-white/30">
                  PNG, JPG, WEBP ou GIF · até 5 MB.
                </span>
              )}
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={handleSubmit} className="grid gap-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Nome <span className="text-red-400">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input autoComplete="name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      E-mail <span className="text-red-400">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="email" {...field} />
                    </FormControl>
                    <FormDescription className="flex items-center gap-1 text-white/30">
                      <ShieldCheck className="h-3 w-3" />
                      Alterar o e-mail muda também seu login.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {error && <p className="text-sm text-red-400">{error}</p>}
              {saved && (
                <p className="text-sm text-emerald-400">Perfil atualizado.</p>
              )}
              <div>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting
                    ? "Salvando…"
                    : "Salvar alterações"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}
    </div>
  )
}

/* ── Acesso ─────────────────────────────────────────────────────── */

export function AccessSection() {
  const { user, forgotPassword } = useAuth()
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRequest() {
    if (!user?.email) return
    setLoading(true)
    setError(null)
    try {
      await forgotPassword(user.email)
      setSent(true)
    } catch {
      setError("Não foi possível enviar o e-mail. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-6">
      <SectionHeader
        title="Acesso"
        description="Gerencie sua senha e segurança de acesso."
      />
      <section className="max-w-lg rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-orange-400" />
          <h3 className="text-sm font-medium">Alterar senha</h3>
        </div>
        {sent ? (
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
            <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            <div className="text-sm text-white/70">
              Enviamos um link para <strong>{user?.email}</strong>. Abra-o para
              definir uma nova senha — a sessão é recuperada com segurança pelo
              próprio link do e-mail.
            </div>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm text-white/50">
              Por segurança, a troca de senha é feita por um link enviado ao seu
              e-mail. Ao clicar no link, você abre a tela de nova senha com a
              sessão recuperada automaticamente.
            </p>
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
            <div className="mt-4">
              <Button onClick={handleRequest} disabled={loading || !user?.email}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Enviar link de alteração
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

/* ── Tema / Aparência ───────────────────────────────────────────── */

export function AppearanceSection() {
  return (
    <div className="grid gap-6">
      <SectionHeader
        title="Tema"
        description="Personalize a aparência do painel."
      />
      <section className="max-w-lg rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-orange-400" />
          <h3 className="text-sm font-medium">Tema</h3>
          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/40">
            Em breve
          </span>
        </div>
        <p className="mt-2 text-sm text-white/50">
          Escolha entre tema escuro, claro ou automático (sistema). A opção de
          tema estará disponível em breve.
        </p>
      </section>
    </div>
  )
}

/* ── Zona de perigo ─────────────────────────────────────────────── */

export function DangerSection() {
  return (
    <div className="grid gap-6">
      <SectionHeader
        title="Zona de perigo"
        description="Ações irreversíveis na sua conta."
      />
      <section className="rounded-lg border border-red-500/20 p-4 sm:p-6">
        <div className="mb-4">
          <h3 className="font-semibold text-red-400">Apagar conta</h3>
          <p className="mt-1 text-sm text-white/50">
            A exclusão permanente da conta removerá todos os seus dados
            pessoais. Esta ação é irreversível.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Excluir minha conta</p>
            <p className="text-xs text-white/40">
              Você precisa sair de todas as organizações como proprietário antes
              de excluir sua conta.
            </p>
          </div>
          <button
            type="button"
            disabled
            className="w-full cursor-not-allowed rounded-md border border-red-500/30 bg-red-500/5 px-4 py-2 text-sm font-medium text-red-400/50 sm:w-auto"
          >
            Apagar conta
          </button>
        </div>
      </section>
    </div>
  )
}
