import { useRouter } from "next/router"
import { CustomerRegistrationPublicPage } from "@/features/customer-self-service"
import { Seo } from "@/shared/components/seo"

export default function CustomerRegistrationPublicRoute() {
  const router = useRouter()

  if (!router.isReady) return null

  const token =
    typeof router.query.token === "string" ? router.query.token : undefined

  return (
    <>
      <Seo title="Complete seu cadastro" noindex />
      <CustomerRegistrationPublicPage token={token} />
    </>
  )
}
