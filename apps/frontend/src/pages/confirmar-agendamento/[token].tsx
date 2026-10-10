import { useRouter } from "next/router"
import { AppointmentConfirmationPublicPage } from "@/features/agenda/components/appointment-confirmation-public-page"
import { Seo } from "@/shared/components/seo"

export default function AppointmentConfirmationRoute() {
  const router = useRouter()

  if (!router.isReady) return null

  const token =
    typeof router.query.token === "string" ? router.query.token : undefined

  return (
    <>
      <Seo title="Confirmar agendamento" noindex />
      <AppointmentConfirmationPublicPage token={token} />
    </>
  )
}
