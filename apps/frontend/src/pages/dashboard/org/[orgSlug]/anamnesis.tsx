import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { OrgLayout, useCurrentOrg } from "@/features/dashboard"
import { AnamnesisFormsPage } from "@/features/anamnesis"

const AnamnesisPageRoute: NextPageWithLayout = () => {
  const { orgId } = useCurrentOrg()
  return <AnamnesisFormsPage orgId={orgId} />
}

AnamnesisPageRoute.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <OrgLayout>{page}</OrgLayout>
  </AuthGuard>
)

export default AnamnesisPageRoute
