import type { ReactElement } from "react"
import { useRouter } from "next/router"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { OrgLayout, useCurrentOrg } from "@/features/dashboard"
import { TicketDetailPage } from "@/features/support"

const TicketDetailRoute: NextPageWithLayout = () => {
  const router = useRouter()
  const ticketId =
    typeof router.query.ticketId === "string" ? router.query.ticketId : undefined
  const { orgId, org } = useCurrentOrg()
  return (
    <TicketDetailPage
      orgId={orgId}
      orgSlug={org.slug}
      ticketId={ticketId}
      routerReady={router.isReady}
    />
  )
}

TicketDetailRoute.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <OrgLayout>{page}</OrgLayout>
  </AuthGuard>
)

export default TicketDetailRoute
