import type { ReactElement } from "react"
import { useRouter } from "next/router"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { OrgLayout, useCurrentOrg } from "@/features/dashboard"
import { MemberDetailPage } from "@/features/organizations"

const MemberDetailRoute: NextPageWithLayout = () => {
  const router = useRouter()
  const userId =
    typeof router.query.userId === "string" ? router.query.userId : undefined
  const { orgId, org } = useCurrentOrg()
  return (
    <MemberDetailPage
      orgId={orgId}
      orgSlug={org.slug}
      userId={userId}
      routerReady={router.isReady}
    />
  )
}

MemberDetailRoute.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <OrgLayout>{page}</OrgLayout>
  </AuthGuard>
)

export default MemberDetailRoute
