import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { OrgLayout, OrgSettingsLayout } from "@/features/dashboard"
import { CampaignSettingsPage } from "@/features/campaigns"

const CampaignsSettingsPage: NextPageWithLayout = () => {
  return <CampaignSettingsPage />
}

CampaignsSettingsPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <OrgLayout>
      <OrgSettingsLayout>{page}</OrgSettingsLayout>
    </OrgLayout>
  </AuthGuard>
)

export default CampaignsSettingsPage
