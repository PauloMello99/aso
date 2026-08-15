import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { AdminLayout } from "@/features/admin"
import { AdminTicketQueue } from "@/features/support"

const AdminSupportPage: NextPageWithLayout = () => <AdminTicketQueue />

AdminSupportPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <AdminLayout>{page}</AdminLayout>
  </AuthGuard>
)

export default AdminSupportPage
