import type { AppProps } from "next/app"
import type { NextPage } from "next"
import type { ReactElement, ReactNode } from "react"
import { AppProviders } from "@/providers"
import "@/styles/globals.css"

// Allow pages to declare a custom layout via getLayout
export type NextPageWithLayout<P = object, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: ReactElement) => ReactNode
}

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout
}

export default function App({ Component, pageProps }: AppPropsWithLayout) {
  const getLayout = Component.getLayout ?? ((page) => page)

  return (
    <AppProviders>{getLayout(<Component {...pageProps} />)}</AppProviders>
  )
}
