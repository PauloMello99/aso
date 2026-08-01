import type { NextPage } from "next"
import { LegalLayout, DpaContent, LEGAL_VERSIONS } from "@/features/legal"

const TratamentoDeDadosPage: NextPage = () => (
  <LegalLayout title="Adendo de Tratamento de Dados" version={LEGAL_VERSIONS.dpa}>
    <DpaContent />
  </LegalLayout>
)

export default TratamentoDeDadosPage
