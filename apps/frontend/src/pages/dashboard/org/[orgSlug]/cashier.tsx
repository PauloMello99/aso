import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { OrgLayout, useCurrentOrg } from "@/features/dashboard"
import { CashierPage } from "@/features/cashier"

const CashierRoute: NextPageWithLayout = () => {
  const { orgId } = useCurrentOrg()
  return <CashierPage orgId={orgId} />
}

CashierRoute.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <OrgLayout>{page}</OrgLayout>
  </AuthGuard>
)

export default CashierRoute
