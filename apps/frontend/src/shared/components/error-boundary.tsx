import { Component, type ErrorInfo, type ReactNode } from "react"
import { Button } from "@/shared/components/ui/button"
import { captureError } from "@/infrastructure/telemetry/telemetry"

interface ErrorBoundaryProps {
  children: ReactNode
  module?: string
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    captureError(error, {
      source: "react-render",
      module: this.props.module ?? "global",
      componentStack: info.componentStack,
    })
  }

  private reset = (): void => {
    this.setState({ hasError: false })
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children
    if (this.props.fallback) return this.props.fallback

    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-4 text-center sm:p-6">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold sm:text-2xl">
            Algo deu errado
          </h1>
          <p className="text-sm text-muted-foreground">
            Encontramos um erro inesperado. Nossa equipe já foi notificada.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={this.reset}>
            Tentar novamente
          </Button>
          <Button onClick={() => window.location.reload()}>
            Recarregar página
          </Button>
        </div>
      </div>
    )
  }
}
