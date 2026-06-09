import { pgEnum } from "drizzle-orm/pg-core";

export const platformRoleEnum = pgEnum("platform_role", [
  "super_admin",
  "user",
]);

export const orgRoleEnum = pgEnum("org_role", ["owner", "employee"]);

export const invitationStatusEnum = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "expired",
  "cancelled",
]);

export const subscriptionTypeEnum = pgEnum("subscription_type", [
  "free",
  "trial",
  "standard",
  "custom",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "trialing",
  "past_due",
  "canceled",
]);

export const billingIntervalEnum = pgEnum("billing_interval", [
  "monthly",
  "semiannual",
  "annual",
]);

export const transactionTypeEnum = pgEnum("transaction_type", [
  "income",
  "outcome",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "bank_transfer",
  "credit_card",
  "debit_card",
  "credits",
]);

export const genderEnum = pgEnum("gender", ["male", "female", "other"]);

export const stockMovementTypeEnum = pgEnum("stock_movement_type", [
  "restock",
  "service_consumption",
  "manual_adjustment",
]);

export const auditActionEnum = pgEnum("audit_action", [
  "create",
  "update",
  "delete",
  "invite_sent",
  "invite_accepted",
  "subscription_changed",
]);
