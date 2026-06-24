export type TransactionType = "income" | "outcome";
export type PaymentMethod =
  | "cash"
  | "bank_transfer"
  | "credit_card"
  | "debit_card"
  | "credits";

export interface TransactionEntityProps {
  id: string;
  orgId: string;
  createdBy: string | null;
  description: string;
  type: TransactionType;
  /** Líquido (gross - fee) — o valor que o caixa reflete. */
  netCents: number;
  grossCents: number;
  feeCents: number;
  paymentMethod: PaymentMethod;
  categoryId: string | null;
  /** Quando preenchido, esta linha é o estorno da transação referenciada. */
  reversesTransactionId: string | null;
  transactedAt: Date;
  createdAt: Date;
}

export interface CreateTransactionData {
  orgId: string;
  createdBy?: string | null;
  description: string;
  type: TransactionType;
  netCents: number;
  grossCents: number;
  feeCents: number;
  paymentMethod: PaymentMethod;
  categoryId?: string | null;
  reversesTransactionId?: string | null;
  transactedAt?: Date;
}

/** Métodos cujo saldo cai no bucket "digital" (banco/cartão/pix). */
const DIGITAL_METHODS: ReadonlySet<PaymentMethod> = new Set([
  "bank_transfer",
  "credit_card",
  "debit_card",
]);

export class TransactionEntity {
  readonly id: string;
  readonly orgId: string;
  readonly createdBy: string | null;
  readonly description: string;
  readonly type: TransactionType;
  readonly netCents: number;
  readonly grossCents: number;
  readonly feeCents: number;
  readonly paymentMethod: PaymentMethod;
  readonly categoryId: string | null;
  readonly reversesTransactionId: string | null;
  readonly transactedAt: Date;
  readonly createdAt: Date;

  private constructor(props: TransactionEntityProps) {
    this.id = props.id;
    this.orgId = props.orgId;
    this.createdBy = props.createdBy;
    this.description = props.description;
    this.type = props.type;
    this.netCents = props.netCents;
    this.grossCents = props.grossCents;
    this.feeCents = props.feeCents;
    this.paymentMethod = props.paymentMethod;
    this.categoryId = props.categoryId;
    this.reversesTransactionId = props.reversesTransactionId;
    this.transactedAt = props.transactedAt;
    this.createdAt = props.createdAt;
  }

  static create(props: TransactionEntityProps): TransactionEntity {
    return new TransactionEntity(props);
  }

  /** Esta linha é, ela própria, um estorno de outra transação. */
  get isReversal(): boolean {
    return this.reversesTransactionId !== null;
  }

  /** Líquido com sinal: income soma, outcome subtrai. */
  get signedNetCents(): number {
    return this.type === "income" ? this.netCents : -this.netCents;
  }

  get isDigital(): boolean {
    return DIGITAL_METHODS.has(this.paymentMethod);
  }
}
