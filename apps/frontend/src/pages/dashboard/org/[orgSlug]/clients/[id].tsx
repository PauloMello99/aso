import type { ReactElement } from "react"
import { useRouter } from "next/router"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { OrgLayout, useCurrentOrg } from "@/features/dashboard"
import { CustomerDetailPage } from "@/features/clients"

const CustomerDetailRoute: NextPageWithLayout = () => {
  const router = useRouter()
  const id = typeof router.query.id === "string" ? router.query.id : undefined
  const { orgId, org } = useCurrentOrg()
  return (
    <CustomerDetailPage
      orgId={orgId}
      orgSlug={org.slug}
      customerId={id}
      routerReady={router.isReady}
    />
  )
}

CustomerDetailRoute.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <OrgLayout>{page}</OrgLayout>
  </AuthGuard>
)

export default CustomerDetailRoute
