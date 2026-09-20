import { DomainException } from "../../../../common/exceptions/domain.exception";

// So dispara se a categoria de sistema "member_payment" (migration 0074) nao
// existir para a org — nunca deve acontecer em orgs criadas apos a 0074, mas
// e registro append-only (trigger da 0073 rejeita UPDATE): um pagamento
// nascido com category_id null e incorrigivel depois, entao o resolver
// (member-payment-category.ts) FALHA em vez de propagar null para o INSERT
// (requisito do database-guardian, veredito da migration 0073). 422, nao
// 404: nao e um id de categoria invalido informado pelo cliente, e um gap de
// provisionamento do lado do servidor — mesma familia de
// ANAMNESIS_FORM_NOT_CONFIGURED (domain-status.map.ts). 404 aqui colidiria
// com PAYMENT_MEMBER_NOT_FOUND/ORGANIZATION_NOT_FOUND no mesmo endpoint e o
// frontend nao conseguiria distinguir as causas so pelo status.
export class MemberPaymentCategoryNotFoundException extends DomainException {
  readonly code = "MEMBER_PAYMENT_CATEGORY_NOT_FOUND";

  constructor(orgId: string) {
    super(`Member payment category not configured for org: ${orgId}`);
  }
}
