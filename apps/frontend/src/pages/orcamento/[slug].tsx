import { useRouter } from "next/router"
import { PublicQuoteRequestForm } from "@/features/quotes"
import { Seo } from "@/shared/components/seo"

export default function QuoteRequestRoute() {
  const router = useRouter()

  if (!router.isReady) return null

  const slug =
    typeof router.query.slug === "string" ? router.query.slug : undefined

  return (
    <>
      <Seo title="Pedir orçamento" noindex />
      {slug && <PublicQuoteRequestForm slug={slug} />}
    </>
  )
}
