import { useRouter } from "next/router"
import { AnamnesisPublicPage } from "@/features/anamnesis"

export default function AnamnesisPublicRoute() {
  const router = useRouter()

  // Evita renderizar "link inválido" por uma fração de segundo antes do
  // router hidratar `query.token` (mesmo cuidado de pages/invite/accept.tsx).
  if (!router.isReady) return null

  const token =
    typeof router.query.token === "string" ? router.query.token : undefined

  return <AnamnesisPublicPage token={token} />
}
