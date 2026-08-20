import { useRouter } from "next/router"
import { CustomerUpdatePublicPage } from "@/features/customer-self-service"
import { Seo } from "@/shared/components/seo"

export default function CustomerUpdatePublicRoute() {
  const router = useRouter()

  if (!router.isReady) return null

  const token =
    typeof router.query.token === "string" ? router.query.token : undefined

  return (
    <>
      <Seo title="Atualize seus dados" noindex />
      <CustomerUpdatePublicPage token={token} />
    </>
  )
}
