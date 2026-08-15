import { PublicTicketForm } from "@/features/support"
import { Seo } from "@/shared/components/seo"

export default function SuportePage() {
  return (
    <>
      <Seo title="Abrir chamado de suporte" noindex />
      <PublicTicketForm />
    </>
  )
}
