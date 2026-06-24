import { useEffect } from "react"
import { useRouter } from "next/router"
import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { OrgLayout } from "@/features/dashboard"

const MembersRedirectPage: NextPageWithLayout = () => {
  const router = useRouter()
  const { orgSlug } = router.query as { orgSlug?: string }

  useEffect(() => {
    if (orgSlug) {
      void router.replace(`/dashboard/org/${orgSlug}/settings/general`)
    }
  }, [orgSlug, router])

  return null
}

MembersRedirectPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <OrgLayout>{page}</OrgLayout>
  </AuthGuard>
)

export default MembersRedirectPage
