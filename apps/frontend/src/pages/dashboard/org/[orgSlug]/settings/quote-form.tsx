import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { OrgLayout, OrgSettingsLayout, useCurrentOrg } from "@/features/dashboard"
import { MyQuoteFormSettings } from "@/features/quotes"

const SettingsQuoteFormPage: NextPageWithLayout = () => {
  const { orgId } = useCurrentOrg()

  return (
    <div className="grid gap-8">
      <div>
        <h2 className="text-lg font-semibold">Formulário de orçamento</h2>
        <p className="mt-0.5 text-sm text-foreground/50">
          Ative o seu formulário público e defina o endereço e o nome que o
          cliente vai ver.
        </p>
      </div>

      <MyQuoteFormSettings orgId={orgId} />
    </div>
  )
}

SettingsQuoteFormPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <OrgLayout>
      <OrgSettingsLayout>{page}</OrgSettingsLayout>
    </OrgLayout>
  </AuthGuard>
)

export default SettingsQuoteFormPage
