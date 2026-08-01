import type { ReactElement } from "react"
import Link from "next/link"
import { Seo } from "@/shared/components/seo"
import { BrandWordmark } from "@/shared/components/brand-wordmark"
import { Button } from "@/shared/components/ui/button"

export default function NotFound() {
  return (
    <div className="dark flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center text-foreground">
      <Seo title="Página não encontrada" noindex />
      <BrandWordmark className="text-2xl" />
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Página não encontrada</h1>
        <p className="text-sm text-foreground/50">
          O endereço que você acessou não existe ou foi removido.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Voltar ao início</Link>
      </Button>
    </div>
  )
}

NotFound.getLayout = (page: ReactElement) => page
