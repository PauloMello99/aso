import {
  pgTable,
  uuid,
  numeric,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { paymentMethodEnum } from "../enums";
import { organizations } from "../organizations";

export const orgMemberPaymentFees = pgTable(
  "org_member_payment_fees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    paymentMethod: paymentMethodEnum("payment_method").notNull(),
    percent: numeric("percent", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    fixedCents: integer("fixed_cents").notNull().default(0),
    active: boolean("active").notNull().default(true),
    supersededAt: timestamp("superseded_at", { withTimezone: true }),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("org_member_payment_fees_org_user_method_active_uq")
      .on(t.orgId, t.userId, t.paymentMethod)
      .where(sql`${t.active}`),
    index("org_member_payment_fees_org_idx").on(t.orgId),
    check(
      "org_member_payment_fees_percent_check",
      sql`${t.percent} >= 0 AND ${t.percent} <= 100`,
    ),
    check(
      "org_member_payment_fees_fixed_cents_check",
      sql`${t.fixedCents} >= 0`,
    ),
    check(
      "org_member_payment_fees_active_superseded_check",
      sql`(${t.active} AND ${t.supersededAt} IS NULL) OR (NOT ${t.active} AND ${t.supersededAt} IS NOT NULL)`,
    ),
  ],
);

export const orgMemberPaymentFeesRelations = relations(
  orgMemberPaymentFees,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [orgMemberPaymentFees.orgId],
      references: [organizations.id],
    }),
  }),
);

export type OrgMemberPaymentFee = typeof orgMemberPaymentFees.$inferSelect;
export type NewOrgMemberPaymentFee = typeof orgMemberPaymentFees.$inferInsert;
