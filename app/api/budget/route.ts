import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  categories,
  goalContributions,
  monthlyPlans,
  purchases,
  savingsGoals,
} from "../../../db/schema";

const CATEGORY_COLORS = [
  "#3B7A68",
  "#D47C4A",
  "#6B6FB3",
  "#C2556A",
  "#3D78A3",
  "#A07A38",
];

const GOAL_COLORS = [
  "#3D78A3",
  "#6B6FB3",
  "#3B7A68",
  "#A07A38",
  "#C2556A",
  "#D47C4A",
];

function isValidMonth(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function asPositiveInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

async function getBudgetData(month: string) {
  const db = getDb();

  const [plan] = await db
    .select({ incomeCents: monthlyPlans.incomeCents })
    .from(monthlyPlans)
    .where(eq(monthlyPlans.month, month))
    .limit(1);

  const categoryRows = await db
    .select({
      id: categories.id,
      name: categories.name,
      budgetCents: categories.budgetCents,
      color: categories.color,
      spentCents: sql<number>`coalesce(sum(${purchases.amountCents}), 0)`,
      purchaseCount: sql<number>`count(${purchases.id})`,
    })
    .from(categories)
    .leftJoin(purchases, eq(categories.id, purchases.categoryId))
    .where(eq(categories.month, month))
    .groupBy(
      categories.id,
      categories.name,
      categories.budgetCents,
      categories.color,
      categories.createdAt
    )
    .orderBy(asc(categories.createdAt), asc(categories.id));

  const purchaseRows = await db
    .select({
      id: purchases.id,
      categoryId: purchases.categoryId,
      categoryName: categories.name,
      categoryColor: categories.color,
      description: purchases.description,
      amountCents: purchases.amountCents,
      purchasedAt: purchases.purchasedAt,
    })
    .from(purchases)
    .innerJoin(categories, eq(purchases.categoryId, categories.id))
    .where(eq(purchases.month, month))
    .orderBy(desc(purchases.purchasedAt), desc(purchases.id))
    .limit(100);

  const goalRows = await db
    .select({
      id: savingsGoals.id,
      name: savingsGoals.name,
      targetCents: savingsGoals.targetCents,
      initialSavedCents: savingsGoals.initialSavedCents,
      dueDate: savingsGoals.dueDate,
      color: savingsGoals.color,
      contributionCents: sql<number>`coalesce(sum(${goalContributions.amountCents}), 0)`,
      savedThisMonthCents: sql<number>`coalesce(sum(case when ${goalContributions.month} = ${month} then ${goalContributions.amountCents} else 0 end), 0)`,
      contributionCount: sql<number>`count(${goalContributions.id})`,
    })
    .from(savingsGoals)
    .leftJoin(goalContributions, eq(savingsGoals.id, goalContributions.goalId))
    .groupBy(
      savingsGoals.id,
      savingsGoals.name,
      savingsGoals.targetCents,
      savingsGoals.initialSavedCents,
      savingsGoals.dueDate,
      savingsGoals.color,
      savingsGoals.createdAt
    )
    .orderBy(asc(savingsGoals.createdAt), asc(savingsGoals.id));

  const normalizedCategories = categoryRows.map((category) => {
    const spentCents = Number(category.spentCents ?? 0);
    return {
      ...category,
      spentCents,
      purchaseCount: Number(category.purchaseCount ?? 0),
      remainingCents: category.budgetCents - spentCents,
    };
  });

  const incomeCents = plan?.incomeCents ?? 0;
  const totalBudgetCents = normalizedCategories.reduce(
    (total, category) => total + category.budgetCents,
    0
  );
  const totalSpentCents = normalizedCategories.reduce(
    (total, category) => total + category.spentCents,
    0
  );
  const goals = goalRows.map((goal) => {
    const contributionCents = Number(goal.contributionCents ?? 0);
    const savedCents = goal.initialSavedCents + contributionCents;
    return {
      ...goal,
      contributionCents,
      savedThisMonthCents: Number(goal.savedThisMonthCents ?? 0),
      contributionCount: Number(goal.contributionCount ?? 0),
      savedCents,
      remainingCents: Math.max(goal.targetCents - savedCents, 0),
    };
  });
  const totalSavedCents = goals.reduce(
    (total, goal) => total + goal.savedCents,
    0
  );
  const savedThisMonthCents = goals.reduce(
    (total, goal) => total + goal.savedThisMonthCents,
    0
  );

  return {
    month,
    incomeCents,
    totalBudgetCents,
    totalSpentCents,
    balanceCents: incomeCents - totalSpentCents - savedThisMonthCents,
    unallocatedCents: incomeCents - totalBudgetCents - savedThisMonthCents,
    totalSavedCents,
    savedThisMonthCents,
    categories: normalizedCategories,
    purchases: purchaseRows,
    goals,
  };
}

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Erro inesperado.";
  if (message.includes("UNIQUE constraint failed")) {
    if (message.includes("savings_goals")) {
      return "Já existe um objetivo com esse nome.";
    }
    return "Já existe uma categoria com esse nome neste mês.";
  }
  if (message.includes("no such table")) {
    return "O banco de dados ainda não está pronto. Tente novamente em instantes.";
  }
  return message;
}

export async function GET(request: Request) {
  const month = new URL(request.url).searchParams.get("month");
  if (!isValidMonth(month)) {
    return Response.json({ error: "Mês inválido." }, { status: 400 });
  }

  try {
    return Response.json(await getBudgetData(month));
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const month = payload.month;
    const action = payload.action;

    if (!isValidMonth(month)) {
      return Response.json({ error: "Mês inválido." }, { status: 400 });
    }

    const db = getDb();

    if (action === "set-income") {
      const incomeCents = asPositiveInteger(payload.incomeCents);
      if (incomeCents === null) {
        return Response.json({ error: "Informe uma renda válida." }, { status: 400 });
      }

      await db
        .insert(monthlyPlans)
        .values({ month, incomeCents })
        .onConflictDoUpdate({
          target: monthlyPlans.month,
          set: { incomeCents, updatedAt: sql`CURRENT_TIMESTAMP` },
        });
    } else if (action === "save-category") {
      const name = typeof payload.name === "string" ? payload.name.trim() : "";
      const budgetCents = asPositiveInteger(payload.budgetCents);
      const categoryId = asPositiveInteger(payload.categoryId);

      if (!name || name.length > 40 || budgetCents === null) {
        return Response.json(
          { error: "Preencha o nome e o limite da categoria." },
          { status: 400 }
        );
      }

      if (categoryId && categoryId > 0) {
        await db
          .update(categories)
          .set({ name, budgetCents })
          .where(and(eq(categories.id, categoryId), eq(categories.month, month)));
      } else {
        const [{ categoryCount }] = await db
          .select({ categoryCount: sql<number>`count(*)` })
          .from(categories)
          .where(eq(categories.month, month));

        await db.insert(categories).values({
          month,
          name,
          budgetCents,
          color: CATEGORY_COLORS[Number(categoryCount ?? 0) % CATEGORY_COLORS.length],
        });
      }
    } else if (action === "delete-category") {
      const categoryId = asPositiveInteger(payload.categoryId);
      if (!categoryId) {
        return Response.json({ error: "Categoria inválida." }, { status: 400 });
      }

      await db
        .delete(categories)
        .where(and(eq(categories.id, categoryId), eq(categories.month, month)));
    } else if (action === "add-purchase") {
      const categoryId = asPositiveInteger(payload.categoryId);
      const amountCents = asPositiveInteger(payload.amountCents);
      const description =
        typeof payload.description === "string" ? payload.description.trim() : "";
      const purchasedAt =
        typeof payload.purchasedAt === "string" ? payload.purchasedAt : "";

      if (
        !categoryId ||
        !amountCents ||
        !description ||
        description.length > 80 ||
        !/^\d{4}-\d{2}-\d{2}$/.test(purchasedAt) ||
        !purchasedAt.startsWith(`${month}-`)
      ) {
        return Response.json(
          { error: "Preencha corretamente a compra, o valor, a data e a categoria." },
          { status: 400 }
        );
      }

      const [category] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.id, categoryId), eq(categories.month, month)))
        .limit(1);

      if (!category) {
        return Response.json({ error: "Categoria não encontrada." }, { status: 404 });
      }

      await db.insert(purchases).values({
        month,
        categoryId,
        description,
        amountCents,
        purchasedAt,
      });
    } else if (action === "delete-purchase") {
      const purchaseId = asPositiveInteger(payload.purchaseId);
      if (!purchaseId) {
        return Response.json({ error: "Compra inválida." }, { status: 400 });
      }

      await db
        .delete(purchases)
        .where(and(eq(purchases.id, purchaseId), eq(purchases.month, month)));
    } else if (action === "save-goal") {
      const goalId = asPositiveInteger(payload.goalId);
      const name = typeof payload.name === "string" ? payload.name.trim() : "";
      const targetCents = asPositiveInteger(payload.targetCents);
      const initialSavedCents = asPositiveInteger(payload.initialSavedCents);
      const dueDate =
        payload.dueDate === undefined ||
        payload.dueDate === null ||
        payload.dueDate === ""
          ? null
          : payload.dueDate;

      if (
        !name ||
        name.length > 40 ||
        !targetCents ||
        initialSavedCents === null
      ) {
        return Response.json(
          { error: "Preencha o nome, a meta e o valor já guardado." },
          { status: 400 }
        );
      }

      if (dueDate !== null && !isValidDate(dueDate)) {
        return Response.json(
          { error: "Informe uma data limite válida ou deixe o campo vazio." },
          { status: 400 }
        );
      }

      if (goalId && goalId > 0) {
        await db
          .update(savingsGoals)
          .set({
            name,
            targetCents,
            initialSavedCents,
            dueDate,
            updatedAt: sql`CURRENT_TIMESTAMP`,
          })
          .where(eq(savingsGoals.id, goalId));
      } else {
        const [{ goalCount }] = await db
          .select({ goalCount: sql<number>`count(*)` })
          .from(savingsGoals);

        await db.insert(savingsGoals).values({
          name,
          targetCents,
          initialSavedCents,
          dueDate,
          color: GOAL_COLORS[Number(goalCount ?? 0) % GOAL_COLORS.length],
        });
      }
    } else if (action === "add-goal-contribution") {
      const goalId = asPositiveInteger(payload.goalId);
      const amountCents = asPositiveInteger(payload.amountCents);
      const contributedAt =
        typeof payload.contributedAt === "string" ? payload.contributedAt : "";

      if (
        !goalId ||
        !amountCents ||
        !/^\d{4}-\d{2}-\d{2}$/.test(contributedAt) ||
        !contributedAt.startsWith(`${month}-`)
      ) {
        return Response.json(
          { error: "Informe um valor e uma data válidos para guardar." },
          { status: 400 }
        );
      }

      const [goal] = await db
        .select({ id: savingsGoals.id })
        .from(savingsGoals)
        .where(eq(savingsGoals.id, goalId))
        .limit(1);

      if (!goal) {
        return Response.json({ error: "Objetivo não encontrado." }, { status: 404 });
      }

      await db.insert(goalContributions).values({
        goalId,
        month,
        amountCents,
        contributedAt,
      });
    } else if (action === "delete-goal") {
      const goalId = asPositiveInteger(payload.goalId);
      if (!goalId) {
        return Response.json({ error: "Objetivo inválido." }, { status: 400 });
      }

      await db.delete(savingsGoals).where(eq(savingsGoals.id, goalId));
    } else {
      return Response.json({ error: "Ação inválida." }, { status: 400 });
    }

    return Response.json(await getBudgetData(month));
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
