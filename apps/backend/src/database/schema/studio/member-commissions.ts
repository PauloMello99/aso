import {
  pgTable,
  uuid,
  text,
  numeric,
  boolean,
  timestamp,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { organizations } from "../organizations";

export const orgMemberCommissions = pgTable(
  "org_member_commissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    percent: numeric("percent", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    mode: text("mode").notNull().default("gross"),
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
    uniqueIndex("org_member_commissions_org_user_active_uq")
      .on(t.orgId, t.userId)
      .where(sql`${t.active}`),
    index("org_member_commissions_org_idx").on(t.orgId),
    check(
      "org_member_commissions_percent_check",
      sql`${t.percent} >= 0 AND ${t.percent} <= 100`,
    ),
    check(
      "org_member_commissions_mode_check",
      sql`${t.mode} IN ('gross','net')`,
    ),
    check(
      "org_member_commissions_active_superseded_check",
      sql`(${t.active} AND ${t.supersededAt} IS NULL) OR (NOT ${t.active} AND ${t.supersededAt} IS NOT NULL)`,
    ),
  ],
);

export const orgMemberCommissionsRelations = relations(
  orgMemberCommissions,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [orgMemberCommissions.orgId],
      references: [organizations.id],
    }),
  }),
);

export type OrgMemberCommission = typeof orgMemberCommissions.$inferSelect;
export type NewOrgMemberCommission = typeof orgMemberCommissions.$inferInsert;
