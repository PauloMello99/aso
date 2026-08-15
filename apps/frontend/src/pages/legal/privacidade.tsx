import type { NextPage } from "next"
import { LegalLayout, PrivacyContent, LEGAL_VERSIONS } from "@/features/legal"

const PrivacidadePage: NextPage = () => (
  <LegalLayout title="Política de Privacidade" version={LEGAL_VERSIONS.privacy} path="/legal/privacidade">
    <PrivacyContent />
  </LegalLayout>
)

export default PrivacidadePage
