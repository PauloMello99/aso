import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { OrgLayout, useCurrentOrg } from "@/features/dashboard"
import { ServicesPage } from "@/features/services"

const ServicesRoute: NextPageWithLayout = () => {
  const { orgId } = useCurrentOrg()
  return <ServicesPage orgId={orgId} />
}

ServicesRoute.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <OrgLayout>{page}</OrgLayout>
  </AuthGuard>
)

export default ServicesRoute
