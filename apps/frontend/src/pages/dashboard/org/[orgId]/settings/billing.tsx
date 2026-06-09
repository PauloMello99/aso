import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { OrgLayout, OrgPagePlaceholder } from "@/features/dashboard"

const SettingsBillingPage: NextPageWithLayout = () => (
  <OrgPagePlaceholder
    title="Cobrança"
    description="Planos, assinaturas e faturamento do ink-ops"
  />
)

SettingsBillingPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <OrgLayout>{page}</OrgLayout>
  </AuthGuard>
)

export default SettingsBillingPage
