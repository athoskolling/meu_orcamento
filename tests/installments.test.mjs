import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../lib/installments.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { summarizeInstallment, installmentMonth } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const sqlSource = readFileSync(new URL('../db/installments.ts', import.meta.url), 'utf8');
const paySql = sqlSource.match(/export const PAY_INSTALLMENT_SQL = `([\s\S]*?)`;/)[1];
const plan = { id: 1, name: 'Celular', amountCents: 30000, totalInstallments: 12, initialPaid: 3, firstPendingMonth: '2026-09' };

test('initial payments do not become expenses; monthly schedule crosses years', () => {
  const result = summarizeInstallment(plan, [], '2026-10');
  assert.equal(result.remainingCents, 270000);
  assert.equal(result.pendingThroughMonthCents, 60000);
  assert.equal(result.nextNumber, 4);
  assert.equal(installmentMonth('2026-12', 1), '2027-01');
});

test('a deleted payment reopens the correct installment, and completion is detected', () => {
  assert.equal(summarizeInstallment(plan, [5], '2026-10').nextNumber, 4);
  const complete = summarizeInstallment(plan, [4,5,6,7,8,9,10,11,12], '2027-12');
  assert.equal(complete.nextNumber, null);
  assert.equal(complete.remainingCents, 0);
});

test('payment SQL charges cash once, rejects duplicates/skips, and deletion reverses progress', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec('PRAGMA foreign_keys = ON');
    const dir = new URL('../drizzle/', import.meta.url);
    for (const file of readdirSync(dir).filter(f => f.endsWith('.sql')).sort()) db.exec(readFileSync(new URL(file, dir), 'utf8'));
    db.exec("INSERT INTO categories (id, month, name) VALUES (1, '2026-09', 'Eletrônicos')");
    db.exec("INSERT INTO installment_plans (id, name, amount_cents, total_installments, initial_paid, first_pending_month) VALUES (1, 'Celular', 30000, 5, 3, '2026-09')");
    const pay = n => db.prepare(paySql).run('2026-09', 1, n, '2026-09-08', n, 1, n, n, 1, '2026-09', n, n);
    assert.equal(pay(5).changes, 0);
    assert.equal(pay(4).changes, 1);
    assert.equal(pay(4).changes, 0);
    assert.equal(db.prepare('SELECT sum(amount_cents) AS spent FROM purchases').get().spent, 30000);
    assert.equal(db.prepare('SELECT payment_source FROM purchases').get().payment_source, 'cash');
    assert.throws(() => db.exec('DELETE FROM installment_plans WHERE id = 1'), /FOREIGN KEY/);
    db.exec('DELETE FROM purchases');
    assert.equal(pay(4).changes, 1);
    assert.equal(pay(5).changes, 1);
    assert.equal(pay(6).changes, 0);
    db.exec('DELETE FROM categories WHERE id = 1');
    assert.equal(db.prepare('SELECT count(*) AS count FROM purchases').get().count, 0);
  } finally { db.close(); }
});
