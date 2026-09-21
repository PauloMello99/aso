import type {
  CreateMemberPaymentData,
  MemberPaymentEntity,
} from "./member-payment.entity";
import type { PaymentMethod } from "./transaction.entity";

export const MEMBER_PAYMENT_REPOSITORY = Symbol("MEMBER_PAYMENT_REPOSITORY");

/**
 * Retorno de findAllByOrgAndUser: paymentMethod NAO entra em
 * MemberPaymentEntity de proposito (ADR-0034 §3 — a entidade referencia a
 * transacao, nao duplica dado dela). E um campo derivado do JOIN com
 * transactions, valido so no contexto desta query de listagem (o frontend
 * precisa do metodo REAL para pre-preencher o dialog de correcao — sem isso
 * cairia num default fixo "cash", inaceitavel para um campo que decide o
 * bucket fisico/digital do caixa).
 */
export interface MemberPaymentWithMethod {
  entity: MemberPaymentEntity;
  paymentMethod: PaymentMethod;
}

export interface IMemberPaymentRepository {
  create(data: CreateMemberPaymentData): Promise<MemberPaymentEntity>;
  findById(id: string, orgId: string): Promise<MemberPaymentEntity | null>;
  /**
   * true se a transacao e a transacao de caixa de um pagamento a membro
   * (org_member_payments.transaction_id) — inclui a perna de estorno, que
   * tambem e gravada nesta tabela. Usado por ReverseTransactionUseCase /
   * CorrectTransactionUseCase para recusar o estorno/correcao direto pelo
   * Caixa (a entidade nao ecoaria e o saldo devido ficaria errado).
   */
  existsByTransactionId(
    transactionId: string,
    orgId: string,
  ): Promise<boolean>;
  /**
   * Subconjunto de `transactionIds` que pertence a algum pagamento a membro
   * (uma unica query — evita N+1 na listagem do Caixa).
   */
  findTransactionIdsWithPayment(
    orgId: string,
    transactionIds: string[],
  ): Promise<Set<string>>;
  findAllByOrgAndUser(
    orgId: string,
    userId: string,
  ): Promise<MemberPaymentWithMethod[]>;
  /**
   * Ids de pagamento que JA TEM uma linha de estorno apontando para eles
   * (reverses_payment_id). Usado para derivar o flag "estornado" na listagem
   * sem materializar coluna nenhuma — o estado append-only nao guarda isso no
   * proprio registro (ADR-0034 §3). Org-wide, SEM filtro por userId — espelha
   * drizzle-transaction.repository.ts:148. Filtrar por userId aqui subestima
   * o flag "estornado" se um estorno nascer com user_id divergente do
   * pagamento original (defesa em profundidade no passo 8, nao garantia).
   */
  findReversedIds(orgId: string): Promise<Set<string>>;
  /**
   * Saldo ja pago liquido ao membro, vitalicio (sem filtro de periodo — ver
   * plano do Bloco 2, "Decisoes de modelagem"). Formula literal, para nao ser
   * reinventada errada depois:
   *
   *   paid_net = SUM(amount_cents) das linhas em que reverses_payment_id IS
   *   NULL E nao existe nenhuma linha de estorno apontando para ela.
   *
   * period_start/period_end de cada linha sao metadado (recibo da fatia
   * final) e NUNCA entram nesta query.
   */
  netPaidCents(orgId: string, userId: string): Promise<number>;
}
