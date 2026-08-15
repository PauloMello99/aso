import { useRouter } from "next/router"
import { AnamnesisPublicPage } from "@/features/anamnesis"
import { Seo } from "@/shared/components/seo"

export default function AnamnesisPublicRoute() {
  const router = useRouter()

  if (!router.isReady) return null

  const token =
    typeof router.query.token === "string" ? router.query.token : undefined

  return (
    <>
      <Seo title="Ficha de anamnese" noindex />
      <AnamnesisPublicPage token={token} />
    </>
  )
}
