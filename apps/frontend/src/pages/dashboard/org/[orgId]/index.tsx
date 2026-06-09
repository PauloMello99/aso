import { useEffect } from "react"
import { useRouter } from "next/router"

// Redirect /dashboard/org/[orgId] → /dashboard/org/[orgId]/overview
export default function OrgIndex() {
  const router = useRouter()
  const { orgId } = router.query as { orgId?: string }

  useEffect(() => {
    if (orgId) {
      void router.replace(`/dashboard/org/${orgId}/overview`)
    }
  }, [orgId, router])

  return null
}
