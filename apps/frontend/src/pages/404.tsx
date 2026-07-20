import type { ReactElement } from "react"
import { useEffect } from "react"
import { useRouter } from "next/router"

export default function NotFound() {
  const router = useRouter()

  useEffect(() => {
    void router.replace("/dashboard/organizations")
  }, [router])

  return null
}

NotFound.getLayout = (page: ReactElement) => page
