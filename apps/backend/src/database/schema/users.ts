import { pgTable, uuid, text, timestamp, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { platformRoleEnum, genderEnum } from "./enums";
import { orgMemberships } from "./organizations";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  authId: uuid("auth_id").unique().notNull(),
  platformRole: platformRoleEnum("platform_role").notNull().default("user"),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  birthDate: date("birth_date"),
  gender: genderEnum("gender"),
  onboardingCompletedAt: timestamp("onboarding_completed_at", {
    withTimezone: true,
  }),
  termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }),
  termsVersion: text("terms_version"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(orgMemberships),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
