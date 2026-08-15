import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { OrgLayout, useCurrentOrg } from "@/features/dashboard"
import { TicketsPage } from "@/features/support"

const SupportPageRoute: NextPageWithLayout = () => {
  const { orgId, org } = useCurrentOrg()
  return <TicketsPage orgId={orgId} orgSlug={org.slug} />
}

SupportPageRoute.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <OrgLayout>{page}</OrgLayout>
  </AuthGuard>
)

export default SupportPageRoute
