import { sql } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const monthlyPlans = sqliteTable("monthly_plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  month: text("month").notNull().unique(),
  incomeCents: integer("income_cents").notNull().default(0),
  foodAllowanceCents: integer("food_allowance_cents").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const categories = sqliteTable(
  "categories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    month: text("month").notNull(),
    name: text("name").notNull(),
    budgetCents: integer("budget_cents").notNull().default(0),
    color: text("color").notNull().default("#3B7A68"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("categories_month_name_unique").on(table.month, table.name),
  ]
);

export const purchases = sqliteTable("purchases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  month: text("month").notNull(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  amountCents: integer("amount_cents").notNull(),
  purchasedAt: text("purchased_at").notNull(),
  paymentSource: text("payment_source", { enum: ["cash", "food"] }).notNull().default("cash"),
  installmentPlanId: integer("installment_plan_id").references(() => installmentPlans.id, { onDelete: "restrict" }),
  installmentNumber: integer("installment_number"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("purchases_installment_unique").on(table.installmentPlanId, table.installmentNumber)]);

export const installmentPlans = sqliteTable("installment_plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  amountCents: integer("amount_cents").notNull(),
  totalInstallments: integer("total_installments").notNull(),
  initialPaid: integer("initial_paid").notNull().default(0),
  firstPendingMonth: text("first_pending_month").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const savingsGoals = sqliteTable("savings_goals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  targetCents: integer("target_cents").notNull(),
  initialSavedCents: integer("initial_saved_cents").notNull().default(0),
  dueDate: text("due_date"),
  color: text("color").notNull().default("#3D78A3"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const goalContributions = sqliteTable("goal_contributions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  goalId: integer("goal_id")
    .notNull()
    .references(() => savingsGoals.id, { onDelete: "cascade" }),
  month: text("month").notNull(),
  amountCents: integer("amount_cents").notNull(),
  contributedAt: text("contributed_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
