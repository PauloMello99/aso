import type { ReactElement } from "react"
import { Lock } from "lucide-react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { OrgLayout, OrgSettingsLayout, useCurrentOrg } from "@/features/dashboard"
import { PaymentFeesForm } from "@/features/cashier"

const SettingsCashierPage: NextPageWithLayout = () => {
  const { org, orgId } = useCurrentOrg()
  const isOwner = org.role === "owner"

  return (
    <div className="grid gap-8">
      <div>
        <h2 className="text-lg font-semibold">Caixa</h2>
        <p className="mt-0.5 text-sm text-white/50">
          Configure as taxas de cartão usadas no cálculo do valor líquido.
        </p>
      </div>

      {isOwner ? (
        <PaymentFeesForm orgId={orgId} />
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-white/50">
          <Lock className="h-4 w-4 shrink-0" />
          Apenas proprietários podem configurar as taxas.
        </div>
      )}
    </div>
  )
}

SettingsCashierPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <OrgLayout>
      <OrgSettingsLayout>{page}</OrgSettingsLayout>
    </OrgLayout>
  </AuthGuard>
)

export default SettingsCashierPage
