import type { NextPage } from "next"
import { LegalLayout, CookiesContent, LEGAL_VERSIONS } from "@/features/legal"

const CookiesPage: NextPage = () => (
  <LegalLayout title="Política de Cookies" version={LEGAL_VERSIONS.cookies}>
    <CookiesContent />
  </LegalLayout>
)

export default CookiesPage
