import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { OrgLayout, OrgPagePlaceholder } from "@/features/dashboard"

const ServicesPage: NextPageWithLayout = () => (
  <OrgPagePlaceholder
    title="Serviços"
    description="Gerencie os serviços oferecidos pelo estúdio"
  />
)

ServicesPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <OrgLayout>{page}</OrgLayout>
  </AuthGuard>
)

export default ServicesPage
