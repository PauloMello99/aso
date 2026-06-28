import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { AdminLayout, AdminOrgs } from "@/features/admin"

const AdminOrgsPage: NextPageWithLayout = () => <AdminOrgs />

AdminOrgsPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <AdminLayout>{page}</AdminLayout>
  </AuthGuard>
)

export default AdminOrgsPage
