import type { ReactElement } from "react";
import { Lock } from "lucide-react";
import type { NextPageWithLayout } from "@/pages/_app";
import { AuthGuard } from "@/features/auth/components/auth-guard";
import {
  OrgLayout,
  OrgSettingsLayout,
  useCurrentOrg,
} from "@/features/dashboard";
import {
  PaymentFeesForm,
  TransactionCategoriesSection,
} from "@/features/cashier";

const SettingsCashierPage: NextPageWithLayout = () => {
  const { org, orgId } = useCurrentOrg();
  const isOwner = org.role === "owner";

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-lg font-semibold">Caixa</h1>
        <p className="mt-0.5 text-sm text-foreground/50">
          Taxas de cartão e categorias usadas nos lançamentos do caixa.
        </p>
      </div>

      {!isOwner ? (
        <div className="flex items-center gap-2 rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] p-4 text-sm text-foreground/50">
          <Lock className="h-4 w-4 shrink-0" />
          Apenas proprietários podem configurar o caixa.
        </div>
      ) : (
        <>
          <div>
            <h2 className="text-sm font-medium text-foreground">
              Taxas de cartão
            </h2>
            <p className="mt-0.5 text-sm text-foreground/50">
              Configure as taxas de cartão usadas no cálculo do valor líquido.
            </p>
            <div className="mt-4">
              <PaymentFeesForm orgId={orgId} />
            </div>
          </div>

          <div>
            <h2 className="text-sm font-medium text-foreground">
              Categorias de lançamento
            </h2>
            <p className="mt-0.5 text-sm text-foreground/50">
              Crie, renomeie ou exclua categorias usadas para classificar
              entradas e saídas do caixa.
            </p>
            <div className="mt-4">
              <TransactionCategoriesSection orgId={orgId} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

SettingsCashierPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <OrgLayout>
      <OrgSettingsLayout>{page}</OrgSettingsLayout>
    </OrgLayout>
  </AuthGuard>
);

export default SettingsCashierPage;
