import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { OrgLayout, OrgPagePlaceholder } from "@/features/dashboard"

const CashierPage: NextPageWithLayout = () => (
  <OrgPagePlaceholder
    title="Caixa"
    description="Receitas, despesas e fluxo de caixa do estúdio"
  />
)

CashierPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <OrgLayout>{page}</OrgLayout>
  </AuthGuard>
)

export default CashierPage
