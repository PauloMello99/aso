import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { OrgLayout, OrgSettingsLayout } from "@/features/dashboard"
import { SubscriptionPage } from "@/features/billing"

const SettingsSubscriptionPage: NextPageWithLayout = () => <SubscriptionPage />

SettingsSubscriptionPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <OrgLayout>
      <OrgSettingsLayout>{page}</OrgSettingsLayout>
    </OrgLayout>
  </AuthGuard>
)

export default SettingsSubscriptionPage
