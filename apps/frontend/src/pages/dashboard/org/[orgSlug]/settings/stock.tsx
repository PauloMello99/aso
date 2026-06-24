import type { ReactElement } from "react"
import { Lock } from "lucide-react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { OrgLayout, OrgSettingsLayout, useCurrentOrg } from "@/features/dashboard"
import { StockVerificationPage } from "@/features/stock"

const SettingsStockPage: NextPageWithLayout = () => {
  const { org, orgId } = useCurrentOrg()
  const isOwner = org.role === "owner"

  return isOwner ? (
    <StockVerificationPage orgId={orgId} />
  ) : (
    <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-white/50">
      <Lock className="h-4 w-4 shrink-0" />
      Apenas proprietários gerenciam a conferência de estoque.
    </div>
  )
}

SettingsStockPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <OrgLayout>
      <OrgSettingsLayout>{page}</OrgSettingsLayout>
    </OrgLayout>
  </AuthGuard>
)

export default SettingsStockPage
