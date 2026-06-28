import { useEffect } from "react"
import { useRouter } from "next/router"
import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { DashboardLayout } from "@/features/dashboard"

const PreferencesPage: NextPageWithLayout = () => {
  const router = useRouter()

  useEffect(() => {
    void router.replace("/dashboard/account")
  }, [router])

  return null
}

PreferencesPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <DashboardLayout>{page}</DashboardLayout>
  </AuthGuard>
)

export default PreferencesPage
