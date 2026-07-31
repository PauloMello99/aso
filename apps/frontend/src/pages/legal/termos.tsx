import type { NextPage } from "next"
import { LegalLayout, TermsContent, LEGAL_VERSIONS } from "@/features/legal"

const TermosPage: NextPage = () => (
  <LegalLayout title="Termos de Uso" version={LEGAL_VERSIONS.terms}>
    <TermsContent />
  </LegalLayout>
)

export default TermosPage
