import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { OrgLayout, OrgPagePlaceholder } from "@/features/dashboard"

const OverviewPage: NextPageWithLayout = () => (
  <OrgPagePlaceholder
    title="Overview"
    description="Resumo geral do desempenho do estúdio"
  />
)

OverviewPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <OrgLayout>{page}</OrgLayout>
  </AuthGuard>
)

export default OverviewPage
