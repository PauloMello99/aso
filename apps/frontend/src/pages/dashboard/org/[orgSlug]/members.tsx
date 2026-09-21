import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { OrgLayout, useCurrentOrg } from "@/features/dashboard"
import { MembersPage } from "@/features/organizations"

const MembersPageRoute: NextPageWithLayout = () => {
  const { orgId } = useCurrentOrg()
  return <MembersPage orgId={orgId} />
}

MembersPageRoute.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <OrgLayout>{page}</OrgLayout>
  </AuthGuard>
)

export default MembersPageRoute
