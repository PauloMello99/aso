import { AcceptInvitationPage } from "@/features/invitations"
import { Seo } from "@/shared/components/seo"

export default function InviteAcceptRoute() {
  return (
    <>
      <Seo title="Aceitar convite" noindex />
      <AcceptInvitationPage />
    </>
  )
}
