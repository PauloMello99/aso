import type { NextPage } from "next"
import { ResetPasswordForm } from "@/features/auth"
import { Seo } from "@/shared/components/seo"

// Sem GuestGuard de propósito: o link de reset do Supabase estabelece uma sessão a
// partir do access_token no hash da URL antes desta página montar — se tivesse
// GuestGuard, o usuário "logado" pelo próprio token seria redirecionado para o
// dashboard antes de conseguir definir a nova senha.
const ResetPasswordPage: NextPage = () => (
  <>
    <Seo title="Redefinir senha" noindex />
    <ResetPasswordForm />
  </>
)

export default ResetPasswordPage
