import type { ReactElement } from "react"
import { CreditCard } from "lucide-react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { OrgLayout, OrgSettingsLayout } from "@/features/dashboard"

const SettingsSubscriptionPage: NextPageWithLayout = () => (
  <div className="grid gap-8">
    <div>
      <h2 className="text-lg font-semibold">Assinatura</h2>
      <p className="mt-0.5 text-sm text-foreground/50">
        Plano, histórico de cobrança e gerenciamento da assinatura desta organização.
      </p>
    </div>

    <section className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-5">
      <div className="flex items-center gap-2">
        <CreditCard className="h-4 w-4 text-orange-400" />
        <h3 className="text-sm font-medium">Gerenciamento de assinatura</h3>
        <span className="rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[10px] uppercase tracking-wide text-foreground/40">
          Em breve
        </span>
      </div>
      <p className="mt-2 text-sm text-foreground/50">
        Aqui você poderá visualizar o histórico de faturas, trocar de plano, atualizar o
        método de pagamento e cancelar a assinatura desta organização.
      </p>
    </section>
  </div>
)

SettingsSubscriptionPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <OrgLayout>
      <OrgSettingsLayout>{page}</OrgSettingsLayout>
    </OrgLayout>
  </AuthGuard>
)

export default SettingsSubscriptionPage
