import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { OrgLayout, useCurrentOrg } from "@/features/dashboard"
import { QuoteInboxPage } from "@/features/quotes"

const QuotesPageRoute: NextPageWithLayout = () => {
  const { orgId, org } = useCurrentOrg()
  return <QuoteInboxPage orgId={orgId} orgSlug={org.slug} role={org.role} />
}

QuotesPageRoute.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <OrgLayout>{page}</OrgLayout>
  </AuthGuard>
)

export default QuotesPageRoute
