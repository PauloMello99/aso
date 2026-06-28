import { useEffect } from "react"
import { useRouter } from "next/router"
import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { OrgLayout } from "@/features/dashboard"

const SettingsBillingPage: NextPageWithLayout = () => {
  const router = useRouter()
  const { orgSlug } = router.query as { orgSlug?: string }

  useEffect(() => {
    if (orgSlug) {
      void router.replace(`/dashboard/org/${orgSlug}/settings/subscription`)
    }
  }, [orgSlug, router])

  return null
}

SettingsBillingPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <OrgLayout>{page}</OrgLayout>
  </AuthGuard>
)

export default SettingsBillingPage
