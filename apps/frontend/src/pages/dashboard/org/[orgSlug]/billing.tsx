import { useEffect } from "react"
import { useRouter } from "next/router"

// /dashboard/org/[orgSlug]/billing → redirect to /dashboard/org/[orgSlug]/settings/billing
export default function BillingRedirect() {
  const router = useRouter()
  const { orgSlug } = router.query as { orgSlug?: string }

  useEffect(() => {
    if (orgSlug) {
      void router.replace(`/dashboard/org/${orgSlug}/settings/billing`)
    }
  }, [orgSlug, router])

  return null
}
