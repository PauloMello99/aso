import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { OrgLayout, OrgSettingsLayout, useCurrentOrg } from "@/features/dashboard"
import { OrgSettingsPage } from "@/features/organizations"

const GeneralSettingsPage: NextPageWithLayout = () => {
  const { orgId } = useCurrentOrg()
  return <OrgSettingsPage orgId={orgId} />
}

GeneralSettingsPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <OrgLayout>
      <OrgSettingsLayout>{page}</OrgSettingsLayout>
    </OrgLayout>
  </AuthGuard>
)

export default GeneralSettingsPage
