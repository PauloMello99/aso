export interface MemberPaymentEntityProps {
  id: string;
  orgId: string;
  userId: string;
  transactionId: string;
  amountCents: number;
  // Coluna Drizzle date(...) sem `{ mode: "date" }" infere string (YYYY-MM-DD),
  // nao Date — mesmo padrao de customers.birthDate/user.entity.birthDate.
  // Tipar como Date aqui forcaria o mapper a fazer `new Date("YYYY-MM-DD")`,
  // que parseia como UTC meia-noite e desloca um dia em fusos negativos.
  periodStart: string | null;
  periodEnd: string | null;
  description: string | null;
  reversesPaymentId: string | null;
  createdBy: string | null;
  createdAt: Date;
}

export interface CreateMemberPaymentData {
  orgId: string;
  userId: string;
  transactionId: string;
  amountCents: number;
  periodStart?: string | null;
  periodEnd?: string | null;
  description?: string | null;
  reversesPaymentId?: string | null;
  createdBy?: string | null;
}

export class MemberPaymentEntity {
  readonly id: string;
  readonly orgId: string;
  readonly userId: string;
  readonly transactionId: string;
  readonly amountCents: number;
  readonly periodStart: string | null;
  readonly periodEnd: string | null;
  readonly description: string | null;
  readonly reversesPaymentId: string | null;
  readonly createdBy: string | null;
  readonly createdAt: Date;

  private constructor(props: MemberPaymentEntityProps) {
    this.id = props.id;
    this.orgId = props.orgId;
    this.userId = props.userId;
    this.transactionId = props.transactionId;
    this.amountCents = props.amountCents;
    this.periodStart = props.periodStart;
    this.periodEnd = props.periodEnd;
    this.description = props.description;
    this.reversesPaymentId = props.reversesPaymentId;
    this.createdBy = props.createdBy;
    this.createdAt = props.createdAt;
  }

  static create(props: MemberPaymentEntityProps): MemberPaymentEntity {
    return new MemberPaymentEntity(props);
  }

  // Linha que EH um estorno (aponta para o pagamento original que reverte).
  // Nao confundir com "foi estornada" (ver findReversedIds no repositorio) —
  // isso e derivado, nao um campo da propria linha (ADR-0034 §3).
  get isReversal(): boolean {
    return this.reversesPaymentId !== null;
  }
}
