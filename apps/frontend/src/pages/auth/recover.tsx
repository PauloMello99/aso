import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { RecoverForm, GuestGuard } from "@/features/auth"
import { Seo } from "@/shared/components/seo"

const Recover: NextPageWithLayout = () => (
  <>
    <Seo title="Recuperar senha" noindex />
    <RecoverForm />
  </>
)

Recover.getLayout = (page: ReactElement) => <GuestGuard>{page}</GuestGuard>

export default Recover
