import type { ReactElement } from "react"
import type { NextPageWithLayout } from "@/pages/_app"
import { LoginForm, GuestGuard } from "@/features/auth"

const Login: NextPageWithLayout = () => <LoginForm />

Login.getLayout = (page: ReactElement) => <GuestGuard>{page}</GuestGuard>

export default Login
