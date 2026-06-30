import type { ReactElement } from "react"
import type { NextPageContext } from "next"
import NextErrorComponent from "next/error"
import { log } from "@logtail/next"
import { captureError } from "@/infrastructure/telemetry/telemetry"

interface ErrorPageProps {
  statusCode: number
}

/**
 * Página de erro custom do Pages Router. Renderiza a UI padrão do Next, mas o
 * getInitialProps reporta o erro ao Better Stack — cobrindo erros de SSR e de
 * navegação client-side que não passam por um error boundary.
 */
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
    // No servidor o envio é em batch — garanta o flush antes de responder.
    if (typeof window === "undefined") await log.flush()
  }

  return { statusCode: errorProps.statusCode }
}

// Sem layout — página de erro bare.
ErrorPage.getLayout = (page: ReactElement) => page

export default ErrorPage
