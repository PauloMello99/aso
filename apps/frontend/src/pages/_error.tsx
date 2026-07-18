import type { ReactElement } from "react"
import type { NextPageContext } from "next"
import NextErrorComponent from "next/error"
import { log } from "@logtail/next"
import { captureError } from "@/infrastructure/telemetry/telemetry"

interface ErrorPageProps {
  statusCode: number
}

function ErrorPage({ statusCode }: ErrorPageProps): ReactElement {
  return <NextErrorComponent statusCode={statusCode} />
}

ErrorPage.getInitialProps = async (
  ctx: NextPageContext,
): Promise<ErrorPageProps> => {
  const errorProps = await NextErrorComponent.getInitialProps(ctx)
  const { err, req } = ctx

  if (err) {
    captureError(err, {
      source: "next-error-page",
      module: "global",
      statusCode: errorProps.statusCode,
      path: req?.url ?? ctx.asPath ?? null,
    })
    if (typeof window === "undefined") await log.flush()
  }

  return { statusCode: errorProps.statusCode }
}

ErrorPage.getLayout = (page: ReactElement) => page

export default ErrorPage
