import { z } from "zod";
import { MAX_INSTALLMENTS } from "../types";

const PAYMENT_METHODS = [
  "cash",
  "bank_transfer",
  "credit_card",
  "debit_card",
] as const;

const installmentsNumber = z
  .number()
  .int("Parcelas deve ser um número inteiro")
  .min(1, "Mínimo de 1 parcela")
  .max(MAX_INSTALLMENTS, `Máximo de ${MAX_INSTALLMENTS} parcelas`);

const moneyString = z
  .string()
  .min(1, "Informe um valor")
  .regex(
    /^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+([.,]\d{1,2})?$/,
    "Informe um valor válido (ex.: 150,00)",
  );

export const transactionSchema = z
  .object({
    description: z.string().min(1, "Descrição é obrigatória").max(200),
    type: z.enum(["income", "outcome"]),
    amount: moneyString,
    paymentMethod: z.enum(PAYMENT_METHODS),
    // Nullable/opcional: só relevante para paymentMethod credit_card, onde o
    // form (passo 20) mostra o seletor de faixa. Trocar de método reseta o
    // valor no componente — o refine abaixo é a rede de segurança.
    installments: installmentsNumber.optional(),
    categoryId: z.string().optional().or(z.literal("")),
    createdBy: z.string().optional().or(z.literal("")),
    transactedAt: z.string().optional().or(z.literal("")),
  })
  // Espelha o CHECK do banco (transactions_installments_check, migration
  // 0074): installments > 1 só é aceito com paymentMethod credit_card.
  .refine(
    (values) =>
      values.installments === undefined ||
      values.installments === 1 ||
      values.paymentMethod === "credit_card",
    {
      message: "Parcelamento só é permitido em cartão de crédito",
      path: ["installments"],
    },
  );

export type TransactionFormValues = z.infer<typeof transactionSchema>;

export const correctionSchema = transactionSchema;

export type CorrectionFormValues = z.infer<typeof correctionSchema>;

const percentString = z
  .string()
  .regex(/^\d+([.,]\d{1,2})?$/, "Percentual inválido")
  .or(z.literal(""));

const fixedString = z
  .string()
  .regex(/^\d+([.,]\d{1,2})?$/, "Valor inválido")
  .or(z.literal(""));

export const feeItemSchema = z
  .object({
    paymentMethod: z.enum(PAYMENT_METHODS),
    percent: percentString,
    fixed: fixedString,
    installments: installmentsNumber,
  })
  // Espelha o CHECK do banco (org_payment_fees_installments_check, migration
  // 0074): installments > 1 só é aceito com paymentMethod credit_card.
  .refine(
    (item) => item.installments === 1 || item.paymentMethod === "credit_card",
    {
      message: "Parcelamento só é permitido em cartão de crédito",
      path: ["installments"],
    },
  );

export const feesSchema = z.object({
  fees: z.array(feeItemSchema),
});

export type FeesFormValues = z.infer<typeof feesSchema>;

export const transactionCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nome é obrigatório")
    .max(60, "Máximo de 60 caracteres"),
});

export type TransactionCategoryFormValues = z.infer<
  typeof transactionCategorySchema
>;

const commissionPercentString = z
  .string()
  .refine(
    (val) => val.trim() === "" || /^\d+([.,]\d{1,2})?$/.test(val),
    "Percentual inválido",
  )
  .refine((val) => {
    if (val.trim() === "") return true;
    const num = Number(val.replace(",", "."));
    return num >= 0 && num <= 100;
  }, "Percentual deve estar entre 0 e 100");

export const commissionItemSchema = z.object({
  userId: z.string(),
  percent: commissionPercentString,
  mode: z.enum(["gross", "net"]),
});

// Shape de SUBMIT da taxa por membro (não estado do formulário): fixedCents já
// é centavo inteiro, igual ao body do PUT /cashier/member-fees e a
// MemberPaymentFeeInput. O componente (passo 16) converte reais->centavos com
// parseReaisToCents antes de validar, como payment-fees-form.tsx.
export const memberFeeItemSchema = z
  .object({
    userId: z.string(),
    paymentMethod: z.enum(["credit_card", "debit_card"]),
    installments: installmentsNumber,
    percent: commissionPercentString,
    fixedCents: z.number().int("Valor inválido").min(0, "Valor inválido"),
  })
  // Espelha o CHECK do banco (org_member_payment_fees_installments_check,
  // migration 0074): installments > 1 só é aceito com paymentMethod
  // credit_card.
  .refine(
    (item) => item.installments === 1 || item.paymentMethod === "credit_card",
    {
      message: "Parcelamento só é permitido em cartão de crédito",
      path: ["installments"],
    },
  );

export const memberFeesSchema = z.object({
  fees: z.array(memberFeeItemSchema),
});

export type MemberFeesFormValues = z.infer<typeof memberFeesSchema>;
