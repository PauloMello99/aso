import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { OrgLayout, OrgPagePlaceholder } from "@/features/dashboard"

const ClientsPage: NextPageWithLayout = () => (
  <OrgPagePlaceholder
    title="Clientes"
    description="Histórico e ficha de cada cliente do estúdio"
  />
)

ClientsPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <OrgLayout>{page}</OrgLayout>
  </AuthGuard>
)

export default ClientsPage
