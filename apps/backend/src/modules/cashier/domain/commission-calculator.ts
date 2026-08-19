import type { CommissionMode } from "./member-commission.entity";

// NAO importar/chamar `computeNet` (fee-calculator.ts) aqui: aquela funcao so
// aplica taxa a metodos elegiveis (FEE_ELIGIBLE_METHODS = cartao credito/debito)
// e devolve netCents == grossCents para dinheiro/pix. Usa-la para decidir a base
// da comissao zeraria silenciosamente o calculo em modo "net" para esses metodos.
// A base "net" da comissao deve vir do valor liquido real da transacao (ja com
// taxa aplicada quando houver), calculado fora desta funcao e passado como
// `netCents`.

export interface MemberCommissionConfig {
  percent: string;
  mode: CommissionMode;
}

export interface CommissionResult {
  baseCents: number;
  commissionCents: number;
}

export function computeCommission(
  grossCents: number,
  netCents: number,
  config?: MemberCommissionConfig | null,
): CommissionResult {
  if (!config) {
    return { baseCents: 0, commissionCents: 0 };
  }

  const baseCents = config.mode === "net" ? netCents : grossCents;
  const percent = Number.parseFloat(config.percent) || 0;
  const raw = Math.round((baseCents * percent) / 100);
  const commissionCents = Math.max(0, Math.min(raw, baseCents));

  return { baseCents, commissionCents };
}
