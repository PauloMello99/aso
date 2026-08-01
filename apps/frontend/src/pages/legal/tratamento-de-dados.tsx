import type { NextPage } from "next"
import { LegalLayout, DpaContent, LEGAL_VERSIONS } from "@/features/legal"

const TratamentoDeDadosPage: NextPage = () => (
  <LegalLayout title="Adendo de Tratamento de Dados" version={LEGAL_VERSIONS.dpa} path="/legal/tratamento-de-dados">
    <DpaContent />
  </LegalLayout>
)

export default TratamentoDeDadosPage
