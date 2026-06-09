import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import {
  DashboardLayout,
  OrganizationsContent,
} from "@/features/dashboard"

const OrganizationsPage: NextPageWithLayout = () => <OrganizationsContent />

OrganizationsPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <DashboardLayout breadcrumbs={[{ label: "Organizações" }]}>
      {page}
    </DashboardLayout>
  </AuthGuard>
)

export default OrganizationsPage
