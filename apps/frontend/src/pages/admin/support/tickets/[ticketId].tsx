import type { ReactElement } from "react"
import { useRouter } from "next/router"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { AdminLayout } from "@/features/admin"
import { AdminTicketDetailPage } from "@/features/support"

const AdminSupportTicketPage: NextPageWithLayout = () => {
  const router = useRouter()
  const ticketId =
    typeof router.query.ticketId === "string" ? router.query.ticketId : undefined

  return (
    <AdminTicketDetailPage ticketId={ticketId} routerReady={router.isReady} />
  )
}

AdminSupportTicketPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <AdminLayout>{page}</AdminLayout>
  </AuthGuard>
)

export default AdminSupportTicketPage
