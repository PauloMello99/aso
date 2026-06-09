import { useEffect } from "react"
import { useRouter } from "next/router"

// /dashboard/org/[orgId]/billing → redirect to /dashboard/org/[orgId]/settings/billing
export default function BillingRedirect() {
  const router = useRouter()
  const { orgId } = router.query as { orgId?: string }

  useEffect(() => {
    if (orgId) {
      void router.replace(`/dashboard/org/${orgId}/settings/billing`)
    }
  }, [orgId, router])

  return null
}
