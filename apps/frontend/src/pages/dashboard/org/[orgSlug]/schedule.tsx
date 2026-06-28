import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { OrgLayout } from "@/features/dashboard"
import { AgendaPage } from "@/features/agenda"

const SchedulePage: NextPageWithLayout = () => <AgendaPage />

SchedulePage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <OrgLayout>{page}</OrgLayout>
  </AuthGuard>
)

export default SchedulePage
