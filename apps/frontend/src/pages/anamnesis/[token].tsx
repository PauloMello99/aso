import { useRouter } from "next/router"
import { AnamnesisPublicPage } from "@/features/anamnesis"

export default function AnamnesisPublicRoute() {
  const router = useRouter()

  if (!router.isReady) return null

  const token =
    typeof router.query.token === "string" ? router.query.token : undefined

  return <AnamnesisPublicPage token={token} />
}
