import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { SignupForm, GuestGuard } from "@/features/auth"
import { Seo } from "@/shared/components/seo"

const Signup: NextPageWithLayout = () => (
  <>
    <Seo
      title="Criar conta"
      description="Comece grátis no ASO — agenda, clientes, estoque e caixa em um único lugar."
      path="/auth/signup"
    />
    <SignupForm />
  </>
)

Signup.getLayout = (page: ReactElement) => <GuestGuard>{page}</GuestGuard>

export default Signup
