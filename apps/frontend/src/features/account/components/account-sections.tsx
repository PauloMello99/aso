"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  KeyRound,
  Loader2,
  MailCheck,
  Monitor,
  Moon,
  Palette,
  RotateCcw,
  ShieldCheck,
  Sun,
  Trash2,
  Upload,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useMe } from "@/features/auth"
import { useAuth } from "@/features/auth"
import { clearSession } from "@/features/auth/lib/session"
import { useOrgs } from "@/features/dashboard/hooks/use-orgs"
import { shouldShowDeleteAccount } from "@/features/account/lib/can-delete-account"
import { apiRequest } from "@/infrastructure/api/client"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { cn } from "@/shared/lib/utils"

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
      <p className="mt-0.5 text-sm text-foreground/50">{description}</p>
    </div>
  )
}

const profileSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(120),
  email: z.string().email("E-mail inválido"),
})
type ProfileFormValues = z.infer<typeof profileSchema>
const MAX_AVATAR_BYTES = 5 * 1024 * 1024

export function ProfileSection() {
  const { me, loading, updateMe, uploadAvatar } = useMe()
  const router = useRouter()
  const { orgs, loading: orgsLoading } = useOrgs()
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
        <div className="flex items-center justify-center py-12 text-foreground/40">
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
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-xl font-semibold text-primary">
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
                <span className="text-xs text-destructive">{avatarError}</span>
              ) : (
                <span className="text-xs text-foreground/30">
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
                      Nome <span className="text-destructive">*</span>
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
                      E-mail <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="email" {...field} />
                    </FormControl>
                    <FormDescription className="flex items-center gap-1 text-foreground/30">
                      <ShieldCheck className="h-3 w-3" />
                      Alterar o e-mail muda também seu login.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              {saved && (
                <p className="text-sm text-success">Perfil atualizado.</p>
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

          <div className="border-t border-foreground/[0.06] pt-5">
            <p className="text-sm font-medium">Tour de boas-vindas</p>
            <p className="mt-0.5 text-xs text-foreground/40">
              Reveja a apresentação guiada das áreas principais da plataforma.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              disabled={orgsLoading || orgs.length === 0}
              onClick={() => {
                const firstOrg = orgs[0]
                if (!firstOrg) return
                void router.push(
                  `/dashboard/org/${firstOrg.slug}/overview?tour=1`,
                )
              }}
            >
              <RotateCcw className="h-4 w-4" />
              Ver tour novamente
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

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
      <section className="max-w-lg rounded-xl border border-border bg-foreground/[0.02] p-5">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">Alterar senha</h3>
        </div>
        {sent ? (
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-success/20 bg-success/5 p-4">
            <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
            <div className="text-sm text-foreground/70">
              Enviamos um link para <strong>{user?.email}</strong>. Abra-o para
              definir uma nova senha — a sessão é recuperada com segurança pelo
              próprio link do e-mail.
            </div>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm text-foreground/50">
              Por segurança, a troca de senha é feita por um link enviado ao seu
              e-mail. Ao clicar no link, você abre a tela de nova senha com a
              sessão recuperada automaticamente.
            </p>
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
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

const THEME_OPTIONS = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
] as const

export function AppearanceSection() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const current = mounted ? (theme ?? "system") : undefined

  return (
    <div className="grid gap-6">
      <SectionHeader
        title="Tema"
        description="Personalize a aparência do painel."
      />
      <section className="max-w-lg rounded-xl border border-border bg-foreground/[0.02] p-5">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">Tema</h3>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Escolha entre claro, escuro ou automático (segue o sistema).
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
            const active = current === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                aria-pressed={active}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs transition-colors",
                  active
                    ? "border-primary/60 bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:bg-foreground/[0.03] hover:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                />
                {label}
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export function DangerSection() {
  const router = useRouter()
  const { user } = useAuth()
  const { orgs, loading: orgsLoading } = useOrgs()
  const [open, setOpen] = useState(false)
  const [confirmation, setConfirmation] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const email = user?.email ?? ""
  const isConfirmed = confirmation.trim().toLowerCase() === email.toLowerCase()

  if (!orgsLoading && !shouldShowDeleteAccount(orgs)) return null

  async function handleDelete() {
    if (!isConfirmed) return
    setLoading(true)
    setError(null)
    try {
      await apiRequest<void>("/auth/me", { method: "DELETE" })
      clearSession()
      await router.replace("/auth/login")
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível excluir a conta.",
      )
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-6">
      <SectionHeader
        title="Zona de perigo"
        description="Ações irreversíveis na sua conta."
      />
      <section className="max-w-lg rounded-xl border border-destructive/20 bg-destructive/[0.02] p-5">
        <div className="mb-4">
          <h3 className="font-semibold text-destructive">Apagar conta</h3>
          <p className="mt-1 text-sm text-foreground/50">
            A exclusão permanente da conta removerá todos os seus dados
            pessoais. Esta ação é irreversível.
          </p>
        </div>
        {!orgsLoading && shouldShowDeleteAccount(orgs) && (
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-sm font-medium">Excluir minha conta</p>
              <p className="text-xs text-foreground/40">
                Você precisa transferir ou excluir as organizações das quais é
                proprietário antes de excluir sua conta.
              </p>
            </div>

            <Dialog
              open={open}
              onOpenChange={(v) => {
                setOpen(v)
                if (!v) {
                  setConfirmation("")
                  setError(null)
                }
              }}
            >
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm" className="w-full sm:w-auto">
                  <Trash2 className="h-4 w-4" />
                  Apagar conta
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Excluir minha conta</DialogTitle>
                  <DialogDescription>
                    Esta ação é{" "}
                    <span className="font-semibold text-destructive">irreversível</span>.
                    Seus dados pessoais serão permanentemente removidos. Se você
                    ainda for proprietário de alguma organização, a exclusão será
                    bloqueada.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-3">
                  <Label htmlFor="delete-account-confirm">
                    Digite seu e-mail{" "}
                    <span className="font-mono text-foreground/80">{email}</span> para
                    confirmar:
                  </Label>
                  <Input
                    id="delete-account-confirm"
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                    placeholder={email}
                    autoComplete="off"
                  />
                  {error && <p className="text-sm text-destructive">{error}</p>}
                </div>

                <DialogFooter>
                  <Button
                    variant="destructive"
                    disabled={!isConfirmed || loading}
                    onClick={handleDelete}
                    className="w-full sm:w-auto"
                  >
                    {loading ? "Excluindo…" : "Excluir permanentemente"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </section>
    </div>
  )
}
