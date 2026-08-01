import type { ReactElement } from "react"
import { useRouter } from "next/router"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { AdminLayout, AdminUserDetail } from "@/features/admin"

const AdminUserDetailPage: NextPageWithLayout = () => {
  const router = useRouter()
  const id = typeof router.query.id === "string" ? router.query.id : undefined
  return <AdminUserDetail id={id} />
}

AdminUserDetailPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <AdminLayout>{page}</AdminLayout>
  </AuthGuard>
)

export default AdminUserDetailPage
