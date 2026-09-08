export type InstallmentPlan = {
  id: number;
  name: string;
  amountCents: number;
  totalInstallments: number;
  initialPaid: number;
  firstPendingMonth: string;
};

export function installmentMonth(firstMonth: string, offset: number) {
  const [year, month] = firstMonth.split('-').map(Number);
  const serial = year * 12 + month - 1 + offset;
  return `${String(Math.floor(serial / 12)).padStart(4, '0')}-${String(serial % 12 + 1).padStart(2, '0')}`;
}

export function summarizeInstallment(plan: InstallmentPlan, paidNumbers: number[], month: string) {
  const paid = new Set(paidNumbers);
  const pending = Array.from({ length: plan.totalInstallments - plan.initialPaid }, (_, i) => plan.initialPaid + i + 1).filter(n => !paid.has(n));
  const dueMonth = (n: number) => installmentMonth(plan.firstPendingMonth, n - plan.initialPaid - 1);
  const nextNumber = pending[0] ?? null;
  return {
    ...plan,
    paidInstallments: plan.totalInstallments - pending.length,
    remainingInstallments: pending.length,
    remainingCents: pending.length * plan.amountCents,
    pendingThroughMonthCents: pending.filter(n => dueMonth(n) <= month).length * plan.amountCents,
    nextNumber,
    nextMonth: nextNumber === null ? null : dueMonth(nextNumber),
    recordedPayments: paidNumbers.length,
  };
}

export type InstallmentSummary = ReturnType<typeof summarizeInstallment>;
