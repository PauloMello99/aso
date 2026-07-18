import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { DashboardLayout } from "@/features/dashboard"
import { AccountPage } from "@/features/account"

const AccountIndexPage: NextPageWithLayout = () => <AccountPage />

AccountIndexPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <DashboardLayout breadcrumbs={[{ label: "Minha Conta" }]}>{page}</DashboardLayout>
  </AuthGuard>
)

export default AccountIndexPage
