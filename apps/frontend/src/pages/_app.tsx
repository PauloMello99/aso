import { useEffect } from "react"
import type { AppProps } from "next/app"
import type { NextPage } from "next"
import type { ReactElement, ReactNode } from "react"
import Head from "next/head"
import { Inter } from "next/font/google"
import { AppProviders } from "@/providers"
import { ErrorBoundary } from "@/shared/components/error-boundary"
import { installGlobalErrorHandlers } from "@/infrastructure/telemetry/telemetry"
import { cn } from "@/shared/lib/utils"
import "@/styles/globals.css"
import "driver.js/dist/driver.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

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

  // Radix portals mount as siblings of the app root directly on <body>,
  // so the font CSS variable is also applied to <body> at runtime to
  // reach them (custom properties only cascade to descendants).
  useEffect(() => {
    document.body.classList.add(inter.variable)
  }, [])

  return (
    <ErrorBoundary>
      <Head>
        <title>ASO</title>
      </Head>
      <div className={cn(inter.variable, "font-sans")}>
        <AppProviders>{getLayout(<Component {...pageProps} />)}</AppProviders>
      </div>
    </ErrorBoundary>
  )
}
