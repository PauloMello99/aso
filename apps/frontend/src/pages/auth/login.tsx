import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { LoginForm, GuestGuard } from "@/features/auth"
import { Seo } from "@/shared/components/seo"

const Login: NextPageWithLayout = () => (
  <>
    <Seo title="Entrar" description="Acesse sua conta ASO." path="/auth/login" />
    <LoginForm />
  </>
)

Login.getLayout = (page: ReactElement) => <GuestGuard>{page}</GuestGuard>

export default Login
