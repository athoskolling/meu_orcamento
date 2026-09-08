import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../lib/budget-balances.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { calculateBalances } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const month = { incomeCents: 300000, foodAllowanceCents: 60000, cashSpentCents: 80000, foodSpentCents: 20000, savedThisMonthCents: 50000, totalBudgetCents: 200000 };

test('cash, food allowance and category planning have distinct balances', () => {
  assert.deepEqual(calculateBalances(month), { balanceCents: 170000, foodBalanceCents: 40000, totalSpentCents: 100000, unallocatedCents: 110000 });
});

test('withdrawing savings changes only cash; overspending food does not consume cash', () => {
  const result = calculateBalances({ ...month, savedThisMonthCents: -10000, foodSpentCents: 70000 });
  assert.equal(result.balanceCents, 230000);
  assert.equal(result.foodBalanceCents, -10000);
});

test('zero allowance preserves the previous cash-only calculations', () => {
  const result = calculateBalances({ ...month, foodAllowanceCents: 0, foodSpentCents: 0 });
  assert.equal(result.balanceCents, 170000);
  assert.equal(result.foodBalanceCents, 0);
  assert.equal(result.unallocatedCents, 50000);
});

test('migration preserves existing income and purchases as cash', () => {
  const db = new DatabaseSync(':memory:');
  try {
    const dir = new URL('../drizzle/', import.meta.url);
    const files = readdirSync(dir).filter((name) => name.endsWith('.sql')).sort();
    for (const file of files.filter((name) => name < '0003')) db.exec(readFileSync(new URL(file, dir), 'utf8'));
    db.exec("INSERT INTO monthly_plans (month, income_cents) VALUES ('2026-09', 300000)");
    db.exec("INSERT INTO categories (id, month, name, budget_cents) VALUES (1, '2026-09', 'Mercado', 50000)");
    db.exec("INSERT INTO purchases (month, category_id, description, amount_cents, purchased_at) VALUES ('2026-09', 1, 'Compra antiga', 10000, '2026-09-01')");
    for (const file of files.filter((name) => name >= '0003')) db.exec(readFileSync(new URL(file, dir), 'utf8'));
    const plan = db.prepare('SELECT income_cents, food_allowance_cents FROM monthly_plans').get();
    assert.equal(plan.income_cents, 300000);
    assert.equal(plan.food_allowance_cents, 0);
    const purchase = db.prepare('SELECT amount_cents, payment_source FROM purchases').get();
    assert.equal(purchase.amount_cents, 10000);
    assert.equal(purchase.payment_source, 'cash');
  } finally {
    db.close();
  }
});
