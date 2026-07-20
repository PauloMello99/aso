import type { ReactElement } from "react"
import { Lock } from "lucide-react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { OrgLayout, OrgSettingsLayout, useCurrentOrg } from "@/features/dashboard"
import { ServiceTypesSettingsPage } from "@/features/services"

const SettingsAnamnesisPage: NextPageWithLayout = () => {
  const { org, orgId } = useCurrentOrg()
  const isOwner = org.role === "owner"

  return (
    <div className="grid gap-8">
      <div>
        <h2 className="text-lg font-semibold">Anamnese</h2>
        <p className="mt-0.5 text-sm text-foreground/50">
          Configure as perguntas da ficha de anamnese de cada tipo de
          serviço.
        </p>
      </div>

      {isOwner ? (
        <ServiceTypesSettingsPage orgId={orgId} />
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] p-4 text-sm text-foreground/50">
          <Lock className="h-4 w-4 shrink-0" />
          Apenas proprietários configuram a ficha de anamnese.
        </div>
      )}
    </div>
  )
}

SettingsAnamnesisPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <OrgLayout>
      <OrgSettingsLayout>{page}</OrgSettingsLayout>
    </OrgLayout>
  </AuthGuard>
)

export default SettingsAnamnesisPage
