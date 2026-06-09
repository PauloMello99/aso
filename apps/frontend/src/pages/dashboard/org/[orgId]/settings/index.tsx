import { useEffect } from "react"
import { useRouter } from "next/router"

// /dashboard/org/[orgId]/settings → redirect to /dashboard/org/[orgId]/settings/general
export default function SettingsIndex() {
  const router = useRouter()
  const { orgId } = router.query as { orgId?: string }

  useEffect(() => {
    if (orgId) {
      void router.replace(`/dashboard/org/${orgId}/settings/general`)
    }
  }, [orgId, router])

  return null
}
