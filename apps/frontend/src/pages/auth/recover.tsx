import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { RecoverForm, GuestGuard } from "@/features/auth"

const Recover: NextPageWithLayout = () => <RecoverForm />

Recover.getLayout = (page: ReactElement) => <GuestGuard>{page}</GuestGuard>

export default Recover
