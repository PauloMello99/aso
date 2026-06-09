import type { ReactElement } from "react"
import { useRouter } from "next/router"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { OrgLayout } from "@/features/dashboard"
import { StockPage } from "@/features/stock"

const StockPageRoute: NextPageWithLayout = () => {
  const { orgId } = useRouter().query as { orgId?: string }

  if (!orgId) return null

  return <StockPage orgId={orgId} />
}

StockPageRoute.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <OrgLayout>{page}</OrgLayout>
  </AuthGuard>
)

export default StockPageRoute
