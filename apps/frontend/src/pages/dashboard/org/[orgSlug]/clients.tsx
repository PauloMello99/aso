import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { OrgLayout, useCurrentOrg } from "@/features/dashboard"
import { ClientsPage } from "@/features/clients"

const ClientsPageRoute: NextPageWithLayout = () => {
  const { orgId } = useCurrentOrg()
  return <ClientsPage orgId={orgId} />
}

ClientsPageRoute.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <OrgLayout>{page}</OrgLayout>
  </AuthGuard>
)

export default ClientsPageRoute
