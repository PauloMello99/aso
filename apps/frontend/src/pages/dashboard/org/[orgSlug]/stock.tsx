import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { OrgLayout, useCurrentOrg } from "@/features/dashboard"
import { StockPage } from "@/features/stock"

const StockPageRoute: NextPageWithLayout = () => {
  const { orgId } = useCurrentOrg()
  return <StockPage orgId={orgId} />
}

StockPageRoute.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <OrgLayout>{page}</OrgLayout>
  </AuthGuard>
)

export default StockPageRoute
