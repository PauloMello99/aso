import type { ReactElement } from "react"
import { useRouter } from "next/router"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { AdminLayout, AdminOrgDetail } from "@/features/admin"

const AdminOrgDetailPage: NextPageWithLayout = () => {
  const router = useRouter()
  const id = typeof router.query.id === "string" ? router.query.id : undefined
  return <AdminOrgDetail id={id} />
}

AdminOrgDetailPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <AdminLayout>{page}</AdminLayout>
  </AuthGuard>
)

export default AdminOrgDetailPage
