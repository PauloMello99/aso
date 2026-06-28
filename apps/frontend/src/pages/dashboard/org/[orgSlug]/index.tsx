import { useEffect } from "react"
import { useRouter } from "next/router"

// Redirect /dashboard/org/[orgSlug] → /dashboard/org/[orgSlug]/overview
export default function OrgIndex() {
  const router = useRouter()
  const { orgSlug } = router.query as { orgSlug?: string }

  useEffect(() => {
    if (orgSlug) {
      void router.replace(`/dashboard/org/${orgSlug}/overview`)
    }
  }, [orgSlug, router])

  return null
}
