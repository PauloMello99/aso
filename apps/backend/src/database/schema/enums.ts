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
]);

export const genderEnum = pgEnum("gender", ["male", "female", "other"]);

export const calendarEventTypeEnum = pgEnum("calendar_event_type", [
  "appointment",
  "unavailability",
]);

export const calendarEventStatusEnum = pgEnum("calendar_event_status", [
  "scheduled",
  "canceled",
]);

export const calendarProviderEnum = pgEnum("calendar_provider", [
  "google",
  "outlook",
  "apple",
]);

export const calendarEventVisibilityEnum = pgEnum(
  "calendar_event_visibility",
  ["private", "shared"],
);

export const calendarAttendeeStatusEnum = pgEnum("calendar_attendee_status", [
  "going",
  "not_going",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "agenda_reminder",
  "member_unavailability",
  "stock_check_reminder",
]);

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
  "anamnesis_invite_sent",
]);

export const anamnesisResponseStatusEnum = pgEnum(
  "anamnesis_response_status",
  ["pending", "submitted"],
);

export const billingInvoiceEventTypeEnum = pgEnum(
  "billing_invoice_event_type",
  ["paid", "payment_failed"],
);

export const ticketStatusEnum = pgEnum("ticket_status", [
  "open",
  "in_progress",
  "waiting_customer",
  "resolved",
  "closed",
]);

export const ticketPriorityEnum = pgEnum("ticket_priority", [
  "low",
  "normal",
  "high",
  "urgent",
]);

export const ticketAuthorTypeEnum = pgEnum("ticket_author_type", [
  "customer",
  "agent",
  "system",
]);
