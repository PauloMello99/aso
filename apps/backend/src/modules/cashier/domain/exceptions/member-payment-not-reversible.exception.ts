import { DomainException } from "../../../../common/exceptions/domain.exception";

// A linha alvo ja e ela mesma um estorno (reverses_payment_id preenchido) —
// nao existe "desestornar" (requisito do database-guardian, revisao do
// passo 1 do plano do Bloco 2). Status 422 (nao 409): espelha
// TRANSACTION_NOT_REVERSIBLE (reverse-transaction.use-case.ts:58-59,
// domain-status.map.ts:30) — distincao do ADR-0010: "nao se estorna um
// estorno" (422) e diferente de "alvo ja TEM um estorno apontando pra ele"
// (409, ver MemberPaymentAlreadyReversedException). Correcao do
// database-guardian em 2026-09-17 (veredito da migration 0073, item 3a):
// o plano original tinha transcrito 409 aqui, errado.
export class MemberPaymentNotReversibleException extends DomainException {
  readonly code = "MEMBER_PAYMENT_NOT_REVERSIBLE";

  constructor(id: string) {
    super(`Member payment cannot be reversed: ${id}`);
  }
}
