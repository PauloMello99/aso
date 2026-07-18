import { useEffect } from "react"
import type { AppProps } from "next/app"
import type { NextPage } from "next"
import type { ReactElement, ReactNode } from "react"
import { AppProviders } from "@/providers"
import { ErrorBoundary } from "@/shared/components/error-boundary"
import { installGlobalErrorHandlers } from "@/infrastructure/telemetry/telemetry"
import "@/styles/globals.css"
import "driver.js/dist/driver.css"

export type NextPageWithLayout<P = object, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: ReactElement) => ReactNode
}

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout
}

export default function App({ Component, pageProps }: AppPropsWithLayout) {
  const getLayout = Component.getLayout ?? ((page) => page)

  useEffect(() => {
    installGlobalErrorHandlers()
  }, [])

  return (
    <ErrorBoundary>
      <AppProviders>{getLayout(<Component {...pageProps} />)}</AppProviders>
    </ErrorBoundary>
  )
}
