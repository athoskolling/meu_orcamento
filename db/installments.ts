import { getRawDb } from './index';
import { summarizeInstallment, type InstallmentPlan } from '../lib/installments';

export async function getInstallments(month: string) {
  const db = getRawDb();
  const [plans, payments] = await db.batch([
    db.prepare(`SELECT id, name, amount_cents AS amountCents, total_installments AS totalInstallments,
      initial_paid AS initialPaid, first_pending_month AS firstPendingMonth FROM installment_plans ORDER BY id DESC`),
    db.prepare(`SELECT installment_plan_id AS planId, installment_number AS number FROM purchases WHERE installment_plan_id IS NOT NULL`),
  ]);
  return (plans.results as InstallmentPlan[]).map(plan => summarizeInstallment(plan,
    (payments.results as { planId: number; number: number }[]).filter(p => p.planId === plan.id).map(p => p.number), month));
}

// One INSERT ... SELECT plus a unique index makes repeated/concurrent payment requests safe.
export const PAY_INSTALLMENT_SQL = `INSERT INTO purchases
  (month, category_id, description, amount_cents, purchased_at, payment_source, installment_plan_id, installment_number)
  SELECT ?, ?, name || ' · parcela ' || ? || '/' || total_installments, amount_cents, ?, 'cash', id, ?
  FROM installment_plans WHERE id = ? AND ? > initial_paid AND ? <= total_installments
  AND EXISTS (SELECT 1 FROM categories WHERE id = ? AND month = ?)
  AND (SELECT count(*) FROM purchases WHERE installment_plan_id = installment_plans.id AND installment_number < ?) = ? - initial_paid - 1
  ON CONFLICT(installment_plan_id, installment_number) DO NOTHING`;

export async function handleInstallmentAction(payload: Record<string, unknown>, month: string): Promise<Response | null> {
  const db = getRawDb();
  const invalid = (error: string, status = 400) => Response.json({ error }, { status });
  const int = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
  if (payload.action === 'add-installment') {
    const { amountCents, totalInstallments, initialPaid, firstPendingMonth } = payload;
    const name = typeof payload.name === 'string' ? payload.name.trim() : '';
    if (!name || name.length > 60 || !int(amountCents) || amountCents === 0 ||
      !int(totalInstallments) || totalInstallments < 1 || totalInstallments > 600 ||
      !int(initialPaid) || initialPaid >= totalInstallments || !Number.isSafeInteger(amountCents * totalInstallments) ||
      typeof firstPendingMonth !== 'string' || !/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(firstPendingMonth) || firstPendingMonth > '9949-12') {
      return invalid('Informe o nome, valor, total de 1 a 600 parcelas, quantidade já paga menor que o total e mês da primeira parcela pendente.');
    }
    await db.prepare('INSERT INTO installment_plans (name, amount_cents, total_installments, initial_paid, first_pending_month) VALUES (?, ?, ?, ?, ?)')
      .bind(name, amountCents, totalInstallments, initialPaid, firstPendingMonth).run();
    return null;
  }
  if (!int(payload.planId) || payload.planId === 0) return invalid('Parcelamento inválido.');
  if (payload.action === 'delete-installment') {
    const result = await db.prepare('DELETE FROM installment_plans WHERE id = ? AND NOT EXISTS (SELECT 1 FROM purchases WHERE installment_plan_id = installment_plans.id)').bind(payload.planId).run();
    return result.meta.changes ? null : invalid('Remova primeiro as compras das parcelas registradas antes de excluir este parcelamento.', 409);
  }
  const { categoryId, installmentNumber, purchasedAt } = payload;
  if (!int(categoryId) || !categoryId || !int(installmentNumber) || typeof purchasedAt !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(purchasedAt) || !purchasedAt.startsWith(month + '-') ||
      !Number.isFinite(Date.parse(purchasedAt)) || new Date(purchasedAt).toISOString().slice(0, 10) !== purchasedAt) {
    return invalid('Escolha uma categoria e uma data válida no mês selecionado.');
  }
  const plan = (await getInstallments(month)).find(p => p.id === payload.planId);
  if (!plan || plan.nextNumber !== installmentNumber || !plan.nextMonth || plan.nextMonth > month) {
    return invalid('Esta parcela não está pendente para o mês selecionado. Atualize o orçamento.', 409);
  }
  const result = await db.prepare(PAY_INSTALLMENT_SQL).bind(month, categoryId, installmentNumber, purchasedAt,
    installmentNumber, payload.planId, installmentNumber, installmentNumber, categoryId, month, installmentNumber, installmentNumber).run();
  return result.meta.changes ? null : invalid('A parcela já foi registrada ou a categoria não está disponível neste mês. Atualize o orçamento.', 409);
}
