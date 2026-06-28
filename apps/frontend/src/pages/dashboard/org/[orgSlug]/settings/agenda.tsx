import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { OrgLayout, OrgSettingsLayout, useCurrentOrg } from "@/features/dashboard"
import { ExternalCalendarsSection } from "@/features/agenda/components/external-calendars-section"

const SettingsAgendaPage: NextPageWithLayout = () => {
  const { org, orgId } = useCurrentOrg()
  const isOwner = org.role === "owner"

  return (
    <div className="grid gap-8">
      <div>
        <h2 className="text-lg font-semibold">Agenda</h2>
        <p className="mt-0.5 text-sm text-foreground/50">
          Configurações de calendário desta organização.
        </p>
      </div>

      <ExternalCalendarsSection orgId={orgId} isOwner={isOwner} />
    </div>
  )
}

SettingsAgendaPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <OrgLayout>
      <OrgSettingsLayout>{page}</OrgSettingsLayout>
    </OrgLayout>
  </AuthGuard>
)

export default SettingsAgendaPage
