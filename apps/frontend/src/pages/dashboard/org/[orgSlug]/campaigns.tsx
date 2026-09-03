import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { OrgLayout, useCurrentOrg } from "@/features/dashboard"
import { CampaignsListPage } from "@/features/campaigns"

const CampaignsPageRoute: NextPageWithLayout = () => {
  const { orgId } = useCurrentOrg()
  return <CampaignsListPage orgId={orgId} />
}

CampaignsPageRoute.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <OrgLayout>{page}</OrgLayout>
  </AuthGuard>
)

export default CampaignsPageRoute
