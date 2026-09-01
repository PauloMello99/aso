import { useRouter } from "next/router"
import { EmailPreferencesPublicPage } from "@/features/campaigns"
import { Seo } from "@/shared/components/seo"

export default function EmailPreferencesPublicRoute() {
  const router = useRouter()

  if (!router.isReady) return null

  const token =
    typeof router.query.token === "string" ? router.query.token : undefined

  return (
    <>
      <Seo title="Preferências de e-mail" noindex />
      <EmailPreferencesPublicPage token={token} />
    </>
  )
}
