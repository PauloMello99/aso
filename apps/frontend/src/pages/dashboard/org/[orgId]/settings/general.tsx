import type { ReactElement } from "react"
import { useRouter } from "next/router"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { OrgLayout } from "@/features/dashboard"
import { OrgSettingsPage } from "@/features/organizations"

const GeneralSettingsPage: NextPageWithLayout = () => {
  const router = useRouter()
  const { orgId } = router.query as { orgId?: string }

  if (!orgId) return null
  return <OrgSettingsPage orgId={orgId} />
}

GeneralSettingsPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <OrgLayout>{page}</OrgLayout>
  </AuthGuard>
)

export default GeneralSettingsPage
