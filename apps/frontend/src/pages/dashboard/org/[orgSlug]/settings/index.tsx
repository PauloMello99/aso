import { useEffect } from "react"
import { useRouter } from "next/router"
import { useOrgs } from "@/features/dashboard/hooks/use-orgs"

// /dashboard/org/[orgSlug]/settings → redireciona por papel:
// owner → settings/general; funcionário → settings/agenda (única seção que ele acessa).
export default function SettingsIndex() {
  const router = useRouter()
  const { orgSlug } = router.query as { orgSlug?: string }
  const { orgs, loading } = useOrgs()

  useEffect(() => {
    if (!orgSlug || loading) return
    const org = orgs.find((o) => o.slug === orgSlug)
    const dest = org && org.role !== "owner" ? "agenda" : "general"
    void router.replace(`/dashboard/org/${orgSlug}/settings/${dest}`)
  }, [orgSlug, loading, orgs, router])

  return null
}
