import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { OrgLayout, OrgPagePlaceholder } from "@/features/dashboard"

const SchedulePage: NextPageWithLayout = () => (
  <OrgPagePlaceholder
    title="Agenda"
    description="Calendário de agendamentos e disponibilidade"
  />
)

SchedulePage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <OrgLayout>{page}</OrgLayout>
  </AuthGuard>
)

export default SchedulePage
