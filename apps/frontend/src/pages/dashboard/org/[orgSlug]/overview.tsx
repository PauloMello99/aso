import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { OrgLayout } from "@/features/dashboard"
import { OverviewPage } from "@/features/overview"

const Overview: NextPageWithLayout = () => <OverviewPage />

Overview.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <OrgLayout>{page}</OrgLayout>
  </AuthGuard>
)

export default Overview
